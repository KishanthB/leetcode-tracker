from flask import Flask, jsonify, request
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv
from datetime import date, timedelta
import psycopg2
import os

load_dotenv()

class CustomJSONProvider(DefaultJSONProvider):

    @staticmethod
    def default(o):
        if isinstance(o, date):
            return o.isoformat()
        return DefaultJSONProvider.default(o)

DAILY_CAP = 1
MAX_GAP = 90
BASE_GAPS = {
    "HARD": 7,
    "MEDIUM": 14,
    "EASY": 28
}

app = Flask(__name__, static_folder="frontend", static_url_path="")

app.json = CustomJSONProvider(app)

def get_connection():
    return psycopg2.connect(dbname = os.getenv("DB_NAME"), 
                            user = os.getenv("DB_USER"), 
                            password = os.getenv("DB_PASSWORD"), 
                            host = os.getenv("DB_HOST"), 
                            port = os.getenv("DB_PORT"))

def compute_revisit_date(difficulty, count = 0):
    return date.today() + timedelta(days = min(BASE_GAPS[difficulty.upper()] * (2 ** count), MAX_GAP))

def parse_revisit_date(revisit_date):
    if isinstance(revisit_date, str):
        try:
            revisit_date = date.fromisoformat(revisit_date)
        except ValueError:
            raise ValueError("Invalid Date")
    else:
        raise ValueError("revisit date needs to be a string")

    if revisit_date <= date.today():
        raise ValueError("revisit date needs to be in the future")

    return revisit_date

#only when the "problem" tuple is the entire row from the database 
def build_problem_dict(problem):
    problem_dict = {
        "problem_no": problem[0],
        "problem_name": problem[1],
        "problem_difficutly": problem[2],
        "problem_status": problem[3],
        "revisit_date": problem[4],
        "problem_url": problem[5],
        "revisit_count": problem[6]
    }
    return problem_dict

@app.route('/')
def home():
    return app.send_static_file("index.html")

@app.route('/api/problem/search', methods = ["GET"])
def search_problems():
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        raw_q = request.args.get("q", "").strip()

        if not raw_q:
            return jsonify({
                "error": "Bad Request",
                "message": "search query cannot be empty or just whitespaces."
            }), 400

        if raw_q.isdigit():
            if int(raw_q) <= 0:
                return jsonify({
                    "error": "Bad Request",
                    "message": "problem number cannot be negative or zero"
                }), 400
            else:
                q = int(raw_q)
        else:
            q = raw_q

        if isinstance(q, int):
            cur.execute("""
                        SELECT * FROM problems
                        WHERE problem_no = %s""", (q, ))
            match = cur.fetchone()

            if match is None:
                return jsonify({
                    "error": "No Match Found",
                    "message": f"No Problem with the id no: {q}. want to add this problem to the database?"
                }), 404
            else:
                problem_dict = build_problem_dict(match)
                return jsonify(problem_dict), 200
            
        else:
            search_term = f"%{q}%"
            cur.execute("""
                        SELECT * FROM problems
                        WHERE problem_name ILIKE %s""", (search_term, ))
            matches = cur.fetchall()

            if not matches:
                return jsonify({
                    "error": "No Match Found",
                    "message": f"No Problem with the name: {q}. want to add this problem to the database?"
                }), 404
            else:
                all_matches = [build_problem_dict(problem) for problem in matches]
                return jsonify(all_matches), 200

    finally:
        conn.close()

@app.route('/api/problems', methods = ["GET", "POST"])
def handle_problems():
    if (request.method == "POST"):
        new_problem = request.get_json(silent = True)

        #checking whether data even came or not
        if new_problem is None:
            return jsonify({"error": "request body must be valid JSON"}), 400

        #handling error cases for problem_no in database

        if not "problem_no" in new_problem:
            return jsonify({"error": "problem number can't be empty"}), 400
        elif new_problem["problem_no"] < 1:
            return jsonify({"error": "problem number can't be negative or zero"}), 400

        #handling error cases for problem_name in database

        if not "problem_name" in new_problem:
            return jsonify({"error": "problem name can't be empty"}), 400

        #handling error cases for problem_difficutly in database

        if not "problem_difficulty" in new_problem:
            return jsonify({"error": "problem difficulty can't be empty"}), 400
        elif new_problem["problem_difficulty"] not in ("Easy", "Medium", "Hard"):
            return jsonify({"error": "wrong type of difficulty"}), 400

        #hard-coding problem status to be stricty "Solved" for current MVP

        new_problem["problem_status"] = "Solved"
        
        #handling error cases for revisit date properly
        if "revisit_date" in new_problem:
            try:
                revisit_date = parse_revisit_date(new_problem["revisit_date"])
            except ValueError as e:
                return jsonify({"error": str(e)}), 400
        else:
            revisit_date = compute_revisit_date(new_problem["problem_difficulty"])

        new_problem["revisit_date"] = revisit_date

        conn = get_connection()

        try:
            cur = conn.cursor()

            cur.execute("""
                INSERT INTO problems (
                         problem_no,
                         problem_name,
                         problem_difficulty,
                         problem_status,
                         revisit_date,
                         problem_url
                        )
                         VALUES (%s, %s, %s, %s, %s, %s);
                        """, 
                        (new_problem["problem_no"],
                         new_problem["problem_name"], 
                         new_problem["problem_difficulty"], 
                         new_problem["problem_status"],
                         revisit_date,
                         new_problem.get("problem_url")))
            conn.commit()
            return jsonify(new_problem), 201
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return jsonify({"error": "problem_no already exists"}), 409
        finally:
            conn.close()

    else:
        conn = get_connection()

        try:
            cur = conn.cursor()

            cur.execute('SELECT * FROM problems;')
            rows = cur.fetchall()
            dict_problems = []

            for row in rows:
                problem = {  # we can do this since db schema rarely change once created.
                    "problem_no": row[0],
                    "problem_name": row[1],
                    "problem_difficulty": row[2],
                    "problem_status": row[3],
                    "revisit_date": row[4],
                    "problem_url": row[5]
                }
                dict_problems.append(problem)

            return jsonify(dict_problems)
        finally:
            conn.close()


# creating a new API route

@app.route("/api/problems/due")
def due_problems():

    conn = get_connection()

    try:
        cur = conn.cursor()

        cur.execute("""
        SELECT problem_no, problem_name, problem_difficulty, problem_url 
        FROM problems WHERE revisit_date <= CURRENT_DATE ORDER BY revisit_date ASC LIMIT %s;
        """, (DAILY_CAP,))
        allDueProblems = cur.fetchall()

        todayProblems = []
        for problem in allDueProblems:
            # i can hardcode since im the one who create the DB
            # but i should learn how to do this when i don't know that or if there is a better way

            # i don't wanna add "original revisit_date" since that wil demotivate me seeing problems from
            # months doesn't got solved "yet" so imma skip it
            dueProblem = {
                "problem_no": problem[0],
                "problem_name": problem[1],
                "problem_difficulty": problem[2],
                "problem_url": problem[3]
            }

            todayProblems.append(dueProblem)
        
        return jsonify(todayProblems), 200

    finally:
        conn.close()

@app.route("/api/problems/<int:problem_no>", methods = ["PATCH"])
def revise_problem(problem_no):

    if not request.is_json:
        return jsonify({"error": "Invalid Header, Please check the content type"}), 415

    body = request.get_json(silent = True)

    if body is None:
        return jsonify({"error": "Bad Request, Invalid JSON body"}), 400

    if not isinstance(body, dict):
        return jsonify({"error": "Bad Request, need JSON"}), 400

    if "remove_from_cycle" in body and not isinstance(body["remove_from_cycle"], bool):
        return jsonify({"error": "Bad Request, remove from cycle should be a boolean"}), 400

    if "revisit_date" in body:
        try:
            revisit_date = parse_revisit_date(body["revisit_date"])
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    conn = get_connection()

    try:
        cur = conn.cursor()

        if body.get("remove_from_cycle") is True:
            cur.execute("""
                    UPDATE problems SET revisit_date = NULL
                    WHERE problem_no = %s
                    RETURNING revisit_count;""", (problem_no, ))
            row = cur.fetchone()
            conn.commit()

            if row is None:
                return jsonify({"error": f"can't find the problem no '{problem_no}'"}), 404

            revisit_count = row[0]
            return jsonify({"success": f"problem no '{problem_no}' is successfully removed from the revisit cycle, revisit counts: {revisit_count}"}), 200

        cur.execute("""
                UPDATE problems SET revisit_count = revisit_count + 1
                WHERE problem_no = %s
                RETURNING problem_difficulty, revisit_count;""", (problem_no, ))
        row = cur.fetchone()

        if row is None:
            return jsonify({"error": f"can't find the problem no '{problem_no}'"}), 404

        difficulty, revisit_count = row

        if "revisit_date" not in body:
            revisit_date = compute_revisit_date(difficulty, revisit_count)

        cur.execute("""
                UPDATE problems SET revisit_date = %s
                WHERE problem_no = %s;""", (revisit_date, problem_no))
        conn.commit()
        
        return jsonify({"success": f"problem no '{problem_no}' is successfully set to revisit on date: '{revisit_date}', current revisit counts: {revisit_count}"}), 200      
        
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug = True)
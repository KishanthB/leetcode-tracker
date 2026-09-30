from flask import Flask, jsonify, request
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv
from datetime import date, timedelta
import psycopg2
import json
import os

load_dotenv()

class CustomJSONProvider(DefaultJSONProvider):

    @staticmethod
    def default(o):
        if isinstance(o, date):
            return o.isoformat()
        return DefaultJSONProvider.default(o)

DAILY_CAP = 1
BASE_GAPS = {
    "HARD": 7,
    "MEDIUM": 14,
    "EASY": 28
}

app = Flask(__name__)

app.json = CustomJSONProvider(app)

conn1 = psycopg2.connect(dbname = os.getenv("DB_NAME"), 
                         user = os.getenv("DB_USER"), 
                         password = os.getenv("DB_PASSWORD"), 
                         host = os.getenv("DB_HOST"), 
                         port = os.getenv("DB_PORT"))
cur1 = conn1.cursor()

def get_connection():
    return psycopg2.connect(dbname = os.getenv("DB_NAME"), 
                            user = os.getenv("DB_USER"), 
                            password = os.getenv("DB_PASSWORD"), 
                            host = os.getenv("DB_HOST"), 
                            port = os.getenv("DB_PORT"))

@app.route('/')
def home():
    return "Welcome to my tracker!"

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

        revisit_date = new_problem.get("revisit_date")

        if not revisit_date:
            today = date.today()
            difficulty = new_problem["problem_difficulty"]

            revisit_date = today + timedelta(days = BASE_GAPS[difficulty.upper()])

        new_problem["revisit_date"] = revisit_date

        conn = get_connection()

        try:
            cur = conn.cursor()

            cur.execute("INSERT INTO problems VALUES (%s, %s, %s, %s, %s, %s);", 
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

        cur.execute("SELECT * FROM problems WHERE revisit_date <= CURRENT_DATE ORDER BY revisit_date ASC LIMIT %s;", (DAILY_CAP,))
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
                "problem_url": problem[5]
            }

            todayProblems.append(dueProblem)
        
        return jsonify(todayProblems), 200

    finally:
        conn.close()

@app.route("/api/problems/<int:problem_no>", methods = ["PATCH"])
def revise_problem(problem_no):

    body = request.get_json(silent = True) or {}

    if not isinstance(body, dict):
        return jsonify({"error": "Bad Request, need JSON"}), 400

    if "remove_from_cycle" in body and not isinstance(body["remove_from_cycle"], bool):
        return jsonify({"error": "Bad Request, remove from cycle should be a boolean"}), 400

    if "revisit_date" in body:
        try:
            revisit_date = date.fromisoformat(body["revisit_date"])
        except (ValueError, TypeError):
            return jsonify({"error": f"{body["revisit_date"]} is an Invalid date"}), 400

    conn = get_connection()

    try:
        cur = conn.cursor()

        cur.execute("SELECT problem_difficulty, revisit_count FROM problems WHERE problem_no = %s;", (problem_no, ))
        data = cur.fetchall()

        if not data: return jsonify({"error": f"can't find the problem no '{problem_no}'"}), 404

        problem_difficulty = data[0][0]
        revisit_count = data[0][1]

        if body.get("remove_from_cycle") is True: 
            cur.execute("UPDATE problems SET revisit_date = NULL WHERE problem_no = %s;", (problem_no, ))
            conn.commit()
            return jsonify({"success": f"successfully removed the problem no: {problem_no} from revision cycle", 
                            "revisit_count": revisit_count}), 200
        else:
            revisit_count += 1

        if "revisit_date" in body:   
            cur.execute("UPDATE problems SET revisit_date = %s, revisit_count = %s WHERE problem_no = %s;", (revisit_date, revisit_count, problem_no))
            conn.commit()
            return jsonify({"success": f"successfully set the new revisit date for the problem no: {problem_no}", 
                            "revisit_date": f"{revisit_date}", 
                            "revisit_count": revisit_count}), 200

        #manual updation for revisit_date
        revisit_date = date.today() + timedelta(days = BASE_GAPS[problem_difficulty.upper()] * (2 ** revisit_count))

        cur.execute("UPDATE problems SET revisit_date = %s, revisit_count = %s WHERE problem_no = %s;", (revisit_date, revisit_count, problem_no))
        conn.commit()
        return jsonify({"success": f"successfully set the new revisit date for the problem no: {problem_no}",
                       "revisit_date": f"{revisit_date}",
                       "revisit_count": revisit_count}), 200
        
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug = True)
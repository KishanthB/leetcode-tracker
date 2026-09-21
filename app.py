from flask import Flask, jsonify, request
from dotenv import load_dotenv
from datetime import date, timedelta
import psycopg2
import os

load_dotenv()

app = Flask(__name__)

conn = psycopg2.connect(dbname = os.getenv("DB_NAME"), user = os.getenv("DB_USER"), password = os.getenv("DB_PASSWORD"), host = os.getenv("DB_HOST"), port = os.getenv("DB_PORT"))
cur = conn.cursor()

@app.route('/')
def home():
    return "Welcome to my tracker!"

@app.route('/api/problems', methods = ["GET", "POST"])
def handle_problems():
    if (request.method == "POST"):
        new_problem = request.get_json()

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

            if difficulty == "Easy": 
                revisit_date = today + timedelta(days = 28)
            elif difficulty == "Medium":
                revisit_date = today + timedelta(days = 14)
            else:
                revisit_date = today + timedelta(days = 7)

        try:
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
    else:
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

if __name__ == '__main__':
    app.run(debug = True)
from flask import Flask, jsonify, request
from dotenv import load_dotenv
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

        try:
            cur.execute("INSERT INTO problems VALUES (%s, %s, %s, %s);", 
                        (new_problem["problem_no"], new_problem["problem_name"], new_problem["problem_difficulty"], new_problem["problem_status"]))
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
                "problem_status": row[3]
            }
            dict_problems.append(problem)

        return jsonify(dict_problems)

if __name__ == '__main__':
    app.run(debug = True)
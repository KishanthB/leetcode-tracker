from datetime import date, timedelta
from dotenv import load_dotenv
import psycopg2
import os
import json

load_dotenv()

conn2 = psycopg2.connect(dbname = os.getenv("DB_NAME"), 
                        user = os.getenv("DB_USER"), 
                        password = os.getenv("DB_PASSWORD"),
                        host = os.getenv("DB_HOST"),
                        port = os.getenv("DB_PORT"))
cur2 = conn2.cursor()

#merging my problems from 2 different json files to one
with open("data/page1.json") as f1, open("data/page2.json") as f2:
    d1 = json.load(f1)
    d2 = json.load(f2)

data1 = d1["data"]
data2 = d2["data"]

problem_set1 = data1["problemsetQuestionListV2"]
problem_set2 = data2["problemsetQuestionListV2"]

questions1 = problem_set1["questions"]
questions2 = problem_set2["questions"]

questions = questions1 + questions2

#creating a function to assign rank based on difficulty for revisit_date
def difficulty_rank(problem):
    order = {"HARD": 1, "MEDIUM": 2, "EASY": 3}
    return order[problem["difficulty"]]

questions = sorted(questions, key = difficulty_rank)

start_date = date(2026, 10, 1)

for i, question in enumerate(questions):

    problem_no = int(question["questionFrontendId"])
    problem_name = question["title"]
    problem_difficulty = question["difficulty"]

    #for problem_status changing the leetcode's mapping to match my enum type
    if question["status"] == "SOLVED":
        problem_status = "Solved"
    elif question["status"] == "ATTEMPTED":
        problem_status = "Attempted"
    else:
        problem_status = "Unsolved"

    revisit_date = start_date + timedelta(days = i)

    #creating the url for the problem based on the patterns from leetcode's problem url
    problem_url = f"https://leetcode.com/problems/{question['titleSlug']}/description"

    cur2.execute("INSERT INTO problems VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (problem_no) DO NOTHING;", 
                 (problem_no, 
                  problem_name, 
                  problem_difficulty, 
                  problem_status, 
                  revisit_date, 
                  problem_url))

    topic_tags = question["topicTags"]
    for tag in topic_tags:
        tag_name = tag["name"]

        cur2.execute("INSERT INTO tags (tag_name) VALUES (%s) ON CONFLICT (tag_name) DO NOTHING RETURNING (tag_id);", (tag_name, ))
        tag_id = cur2.fetchone()

        if tag_id is None:
            cur2.execute("SELECT tag_id FROM tags WHERE tag_name = %s;", (tag_name, ))
            tag_id = cur2.fetchone()[0]
        else:
            tag_id = tag_id[0]

        cur2.execute("INSERT INTO problem_tags VALUES (%s, %s) ON CONFLICT (problem_no, tag_id) DO NOTHING;", (problem_no, tag_id))
    
    if (i + 1) % 20 == 0:
        conn2.commit()
conn2.commit()
cur2.close()
conn2.close()
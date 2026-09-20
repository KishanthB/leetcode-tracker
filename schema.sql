CREATE DATABASE leetcode_tracker;
CREATE TABLE problems(
    problem_no INTEGER PRIMARY KEY,
    problem_name TEXT NOT NULL,
    problem_difficulty TEXT NOT NULL,
    problem_status BOOLEAN DEFAULT FALSE NOT NULL
);

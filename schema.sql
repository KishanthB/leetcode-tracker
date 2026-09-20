CREATE DATABASE leetcode_tracker;
CREATE TABLE problems(
    problem_no INTEGER PRIMARY KEY,
    problem_name TEXT NOT NULL,
    problem_difficulty TEXT NOT NULL,
    problem_status BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TYPE problem_status_enum AS ENUM ('Unsolved', 'Attempted', 'Solved');

ALTER TABLE problems
ALTER COLUMN problem_status 
DROP DEFAULT;

ALTER TABLE problems
ALTER COLUMN problem_status TYPE problem_status_enum
USING CASE WHEN problem_status THEN 'Solved' ELSE 'Unsolved' END::problem_status_enum;

ALTER TABLE problems
ALTER COLUMN problem_status
SET DEFAULT 'Unsolved';
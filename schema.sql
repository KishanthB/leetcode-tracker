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

ALTER TABLE problems
ADD COLUMN revisit_date DATE,
ADD COLUMN problem_url TEXT;

CREATE TABLE tags(
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL UNIQUE
);

CREATE TABLE problem_tags(
    problem_no INTEGER REFERENCES problems(problem_no) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (problem_no, tag_id)
);

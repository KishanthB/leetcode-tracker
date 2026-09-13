from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to my tracker!"

@app.route('/api/problems')
def get_problems():
    problems = [
        {"Name": "Two Sum", "Difficulty": "Easy", "Solved": True}, 
        {"Name": "Binary Tree Inorder Traversal", "Difficulty": "Medium", "Solved": True}
    ]
    return jsonify(problems)

if __name__ == '__main__':
    app.run(debug = True)
from flask import Flask, jsonify, request

app = Flask(__name__)

problems = [
        {"name": "Two Sum", "difficulty": "Easy", "solved": True}, 
        {"name": "Binary Tree Inorder Traversal", "difficulty": "Medium", "solved": True}
    ]

@app.route('/')
def home():
    return "Welcome to my tracker!"

@app.route('/api/problems', methods = ["GET", "POST"])
def handle_problems():
    if (request.method == "POST"):
        new_problem = request.get_json()
        problems.append(new_problem)
        return jsonify(new_problem), 201
    else:
        return jsonify(problems)

if __name__ == '__main__':
    app.run(debug = True)
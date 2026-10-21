async function getDueProblems() {
    try {
        const response = await fetch("/api/problems/due");
        if (!response.ok) throw new Error(`Server returned: ${response.status}`);
        const problems = await response.json();
        renderDueProblems(problems);
    } catch(error) {
        showMessage(error.message);
    }
}

function checkChildExistence(parent, child) {
    if (parent.querySelector("child") !== null) return true;
    else return false; 
}

function showMessage(message) {
    const msg = document.createElement("h3");
    msg.textContent = message;
    document.body.append(msg);
}

function renderDueProblems(problems) {
    if (problems.length === 0) {
        showMessage("No Problems Today! Good Job");
        return;
    }
    const list = document.querySelector("#problem-list");
    for (const problem of problems) {
        const li = document.createElement("li");
        const card = document.createElement("div");
        const difficulty = document.createElement("span");
        const button = document.createElement("button");
        let title;

        if (problem.problem_url === null) {
            title = document.createElement("span");
            title.textContent = `${problem.problem_no}. ${problem.problem_name}`;
        } else {
            title = document.createElement("a");
            title.textContent = `${problem.problem_no}. ${problem.problem_name}`;
            title.href = problem.problem_url;
            title.target = "_blank";
            title.rel = "noopener noreferrer";
            title.style.textDecoration = "none";
        }

        card.classList.add("card");
        difficulty.classList.add(problem.problem_difficulty.toLowerCase());
        difficulty.textContent = problem.problem_difficulty;
        button.textContent = "Mark revised";

        card.append(title, difficulty, button);
        li.append(card);

        list.append(li);

        button.addEventListener("click", async() => {
            button.disabled = true;
            try {
                const response = await fetch(`/api/problems/${problem.problem_no}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({})
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error)
                }
                const msg = await response.json();
                console.log(msg.success);

                li.remove();

                if (checkChildExistence(list, li)) {
                    const message = "No more problems due today! come back tomorrow.";
                    showMessage(message);
                }
            } catch(error) {
                showMessage(error);
                button.disabled = false;
            }
        });
    }
}

getDueProblems();
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
//add the route or url parameter if patching on multiple routes
async function updateProblem(problemNo, patchOjbect) {
    try {
        const response = await fetch(`/api/problems/${problemNo}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(patchOjbect)
        });

        let result;

        if (!response.ok) {
            result = await response.json();
            throw new Error(result.error || `server responded with status: ${response.status}`);
        } else {
            result = await response.json();
            showMessage(result.success || "update successful!");
        }

    } catch(error) {
        showMessage(error.message || "a network error occurred");
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
        const dialog = document.getElementById("revision-dialog");
        const revisit_date_element = document.getElementById("revisit_date");
        const remove_from_cycle_element = document.getElementById("remove_from_cycle");
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
            dialog.showModal();
        });
    }

    revisit_date_element.addEventListener("input", () => {
        const revisit_date = revisit_date_element.value;
        remove_from_cycle_element.disabled = revisit_date !== "";
    });

    remove_from_cycle_element.addEventListener("change", () => {
        const remove_from_cycle = remove_from_cycle_element.checked;
        revisit_date_element.disabled = remove_from_cycle;
    });

    const confirm_revision = document.getElementById("confirm-revision");
        confirm_revision.addEventListener("click", () => {
        const finalDate = revisit_date_element.value;
        const finalCheckSate = remove_from_cycle_element.checked;

        let patchOjbect;
                
        if (finalDate === "" && finalCheckSate === false) {
            patchOjbect = {};
        } else if (finalDate !== "" && finalCheckSate === false) {
            patchOjbect = {reivsit_date: finalDate};
        } else {
            patchOjbect = {remove_from_cycle: finalCheckSate};
        }

        updateProblem(problem.problem_no, patchOjbect).catch(err => {
            console.error(err);
        });

        dialog.close();

    });

    const cancel_revision = document.getElementById("cancel-revision");
    cancel_revision.addEventListener("click", () => {
        revisit_date_element.value = "";
        remove_from_cycle_element.checked = false;

        revisit_date_element.disabled = false;
        remove_from_cycle_element.disabled = false;

        dialog.close();
    });

}

getDueProblems();
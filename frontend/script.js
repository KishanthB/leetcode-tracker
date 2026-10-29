//gloabal variables
let dialog = null;
let currentBtn = null;
let currentProblemNo = null;
let revisit_date_element = null;
let remove_from_cycle_element = null;

function isDigit(str) {
    return /^[1-9]\d+$/.test(str);
}

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

    } finally {
        if (currentBtn) currentBtn.disabled = false;
    }
}

function checkChildExistence(parent, child) {
    return parent.querySelector(child) !== null;
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

    let title;
    const list = document.querySelector("#problem-list");
    revisit_date_element = document.getElementById("revisit_date");
    remove_from_cycle_element = document.getElementById("remove_from_cycle");

    for (const problem of problems) {
        const li = document.createElement("li");
        const card = document.createElement("div");
        const difficulty = document.createElement("span");
        const button = document.createElement("button");
        dialog = document.getElementById("revision-dialog");
        
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
            currentBtn = button;
            currentProblemNo = problem.problem_no;
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
    confirm_revision.addEventListener("click", async () => {
        const finalDate = revisit_date_element.value;
        const finalCheckSate = remove_from_cycle_element.checked;

        let patchOjbect;
                
        if (finalDate === "" && finalCheckSate === false) {
            patchOjbect = {}; // my flask server is made to handle this as user wants to allow the server to calculate the next revisit date
        } else if (finalDate !== "" && finalCheckSate === false) {
            patchOjbect = {revisit_date: finalDate};
        } else {
            patchOjbect = {remove_from_cycle: finalCheckSate};
        }
        try {
            await updateProblem(currentProblemNo, patchOjbect);
            dialog.close();
        } catch(error) {
            showMessage(error.message);
        }
    });

    const cancel_revision = document.getElementById("cancel-revision");
    cancel_revision.addEventListener("click", () => {
        revisit_date_element.value = "";
        remove_from_cycle_element.checked = false;

        revisit_date_element.disabled = false;
        remove_from_cycle_element.disabled = false;

        if (currentBtn) currentBtn.disabled = false;

        dialog.close();
    });

}

//getting daily due problems
getDueProblems();

//when search button is clicked
const searchBtn = document.getElementById("search_btn");
searchBtn.addEventListener("click", async () => {
    currentBtn = searchBtn;
    currentBtn.disabled = true;
    const input = document.getElementById("search_input");
    getSearchProblems(input.value);
});

//to get search problems
async function getSearchProblems(searchInput) {
    try {
        const safeInput = encodeURIComponent(searchInput);
        const response = await fetch(`/api/problems/search?q=${safeInput}`);

        let result;

        if (!response.ok) {
            result = await response.json();
            throw new Error(result.message || "something went wrong");
        } else {
            result = await response.json();
            renderSearchProblems(result);
        }
    }

    finally {
        if (currentBtn) currentBtn.disabled = false;
    }
}

const dialogConfirmBtn = document.querySelector("#search-confirm");
const dialogCancelBtn = document.querySelector("#search-cancel");
const container = document.querySelector(".search-problem-dialog");
const problemRevisitDate = document.querySelector("#search-revisit-date");
const problemRmvCheckBox = document.querySelector("#search-remove-from-cycle")

function openProblemDialog(problem) {
    container.showModal();
    const problemNo = document.querySelector("#search-problem-no");
    const problemName = document.querySelector("#search-problem-name");
    const problemDiff = document.querySelector("#search-problem-difficulty");
    const problemURL = document.querySelector("#search-problem-url");
    const problemRevisitCount = document.querySelector("#search-revisit-count");
    const problemRevisitMsg = document.querySelector("#search-revisit-message");
    const problemRmvFrmCycleMsg = document.querySelector("#remove-from-cycle-message");

    currentProblemNo = problem.problem_no;

    problemNo.querySelector("span").textContent = problem.problem_no;
    problemName.querySelector("span").textContent = problem.problem_name;
    problemDiff.querySelector("span").textContent = problem.problem_difficulty;
    problemURL.querySelector("span a").href = problem.problem_url;
    problemRevisitCount.querySelector("span").textContent = problem.revisit_count;

    if (problem.revisit_date === null) {
        problemRevisitDate.value = "";
        problemRevisitMsg.textContent = "No revisit date";
        problemRmvCheckBox.disabled = true;
        problemRmvFrmCycleMsg.textContent = "Already removed";
    } else {
        problemRevisitDate.value = problem.revisit_date;
        problemRevisitMsg.textContent = "";
        problemRmvCheckBox.disabled = false;
    }

    problemRmvCheckBox.checked = false;
}

dialogConfirmBtn.addEventListener("click", async () => {
    const finalRevisitDate = problemRevisitDate.value;
    const finalCheckBoxState = problemRmvCheckBox.checked;

    let patchObject;

    if (finalCheckBoxState) {
        patchObject = {remove_from_cycle: true};
    } else if (finalRevisitDate !== "") {
        patchObject = {revisit_date: finalRevisitDate};
    } else {
        patchObject = {};
    }

    const response = await updateProblem(currentProblemNo, patchObject);

    container.close();
    
    if (response.ok) {
        getSearchProblems(document.getElementById("search-input").value);
    }

});

dialogCancelBtn.addEventListener("click", async () => {
    container.close();
});

function renderSearchProblems(problems) {
    const resultContainer = document.querySelector(".search_results");
    resultContainer.replaceChildren();

    if (problems.length == 0) {
        const message = "No Problems were found";
        resultContainer.append(message);
        return;
    } 

    for (const problem of problems) {
        const problemBtn = document.createElement("button");
        const problem_title = document.createElement("span");
        
        problemBtn.type = "button";
        problem_title.textContent = `${problem.problem_no}. ${problem.problem_name}`;
        
        problemBtn.append(problem_title);
        resultContainer.append(problemBtn);

        problemBtn.addEventListener("click", async () => {
            openProblemDialog(problem);

        });
    }

}
// ==== SHARED FUNCTIONS ====

// to show messages (both success and error)
function showMessage(message) {
    const msg = document.createElement("h3");
    msg.textContent = message;
    document.body.append(msg);
}

//to check for child existence
function checkChildExistence(parent, child) {
    return parent.querySelector(child) !== null;
}

// to check for digits from 1 to infinity
function isPosDigit(digit) {
    posRegex = /^[1-9]\d*$/;
    return posRegex.test(digit);
}

// ==== END OF SHARED FUNCTIONS ====

// ==== REVISION DIALOG ====

// selecting elements
const revisionDialog = document.getElementById("revision-dialog");
const revisionForm = document.getElementById("revision-form");
const revisionTitle = document.getElementById("revision-title");
const editMessage = document.getElementById("edit-message");
const revisitDate = document.getElementById("revisit-date");
const removeFromCycle = document.getElementById("remove-from-cycle");
const cancelRevision = document.getElementById("cancel-revision");

// to open the revision dialog box
function openRevisionDialog(problem) {
    revisionDialog.dataset.problemNo = problem.problem_no;
    revisionTitle.textContent = problem.problem_name;

    revisitDate.disabled = false;
    removeFromCycle.disabled = false;

    revisionForm.reset();

    revisionDialog.showModal();
}

//add the route or url parameter if patching on multiple routes
async function updateProblem(problemNo, patchOjbect) {
    const response = await fetch(`/api/problems/${problemNo}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(patchOjbect)
    });

    let result = response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(result?.message || `Server responded with status: ${response.status}`)
    }

    return result;
}

revisitDate.addEventListener("input", () => {
    if (revisitDate.value !== "") {
        removeFromCycle.disabled = true;
        editMessage.textContent = "can't select both date and remove from cycle";
    } else {
        removeFromCycle.disabled = false;
        editMessage.replaceChildren();
    }
});

removeFromCycle.addEventListener("change", () => {
    if (removeFromCycle.checked) {
        revisitDate.disabled = true;
        editMessage.textContent = "can't select both date and remove from cycle";
    } else {
        revisitDate.disabled = false;
        editMessage.replaceChildren();
    }
});

revisionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    let patchOjbect;
    if (removeFromCycle.checked) {
        patchOjbect = {remove_from_cycle: true};
    } else if (revisitDate.value !== "") {
        patchOjbect = {revisit_date: revisitDate.value};
    } else {
        patchOjbect = {};
    }

    try {
        const response = await updateProblem(revisionDialog.dataset.problemNo, patchOjbect);
        showMessage(response);
        loadDueProblems();
        revisionDialog.close();
    } catch (error) {
        showMessage(error);
    }
});

cancelRevision.addEventListener("click", () => {
    revisionDialog.close();
});

// ==== END OF REVISION DIALOG ====

// ==== DUE PROBLEMS ====

//selecting elements
const reviseList = document.getElementById("problem-list");
const emptyNote = document.getElementById("empty-note");

//to get due problems from server
async function getDueProblems() {
    const response = await fetch("/api/problems/due");
    if (!response.ok) throw new Error(`Server returned: ${response.status}`);
    const problems = await response.json();
    return problems;
}

//to render the revise problems on the page
function renderDueProblems(problems) {
    emptyNote.hidden = problems.length > 0;

    reviseList.replaceChildren();

    for (const problem of problems) {
        const item = document.createElement("li");
        const difficulty = document.createElement("span");
        const markRevised = document.createElement("button");
        const problemTitle = `${problem.problem_no}. ${problem.problem_name}`;

        let title;
        if (problem.problem_url === null) {
            title = document.createElement("span");
            title.textContent = problemTitle;
        } else {
            title = document.createElement("a");
            title.textContent = problemTitle;
            title.href = problem.problem_url;
            title.target = "_blank";
            title.rel = "noopener noreferrer"
        }

        difficulty.textContent = problem.problem_difficulty;
        markRevised.textContent = "mark revised";

        item.append(title, difficulty, markRevised);

        reviseList.append(item);

        markRevised.addEventListener("click", () => {
            openRevisionDialog(problem);
        });

    }
}

// to get the problems from getDueProblems and call the render function
async function loadDueProblems() {
    try {
        const problems = await getDueProblems();
        renderDueProblems(problems);
    }
    catch(error) {
        showMessage(error.message);
    }
}

//initial call 
loadDueProblems();

// ==== END OF DUE PROBLEMS ==== 

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

//add new problem 
const addNewBtn = document.querySelector("#add-btn");
const newProblemContainer = document.querySelector(".add-problem-dialog");

addNewBtn.addEventListener("click", () => {
    newProblemContainer.showModal();
});

const newProblemConfirm = document.querySelector("#add-confirm");
newProblemConfirm.addEventListener("click", async () => {
    const problemData = getNewProblemData();

    if (!problemData) return;

    await addNewProblem(problemData);
});

const newProblemCancel = document.querySelector("#add-cancel");
newProblemCancel.addEventListener("click", () => {
    newProblemNo.value = "";
    newProblemName.value = "";
    newProblemDifficulty.value = "";
    newProblemStatus.value = "";
    newProblemURL.value = "";
    newRevisitDate.value = "";

    newProblemContainer.close();
});

const newProblemNo = document.querySelector("#new-problem-no");
const newProblemName = document.querySelector("#new-problem-name");
const newProblemDifficulty = document.querySelector("#new-problem-difficulty");
const newProblemStatus = document.querySelector("#new-problem-status");
const newProblemURL = document.querySelector("#new-problem-url");
const newRevisitDate = document.querySelector("#new-problem-revisit-date");


//to get new problem data 
function getNewProblemData() {
    const finalNewProbNo = newProblemNo.value;
    const finalNewProbName = newProblemName.value;
    const finalNewProbDiff = newProblemDifficulty.value;
    const finalNewProbStatus = newProblemStatus.value;
    const finalNewProbURL = newProblemURL.value;
    const finalNewProbDate = newRevisitDate.value;

    let msg;

    if (!isDigit(finalNewProbNo)) {
        msg = {
            message: "problem no should be a valid number starting from 1"
        };
        showMessage(msg);
        return;
    }

    if (!finalNewProbName) {
        msg = {
            message: "problem name cannot be empty"
        };
        showMessage(msg);
        return;
    }

    const problemData = {
        problem_no: finalNewProbNo,
        problem_name: finalNewProbName,
        problem_difficulty: finalNewProbDiff,
        problem_status: finalNewProbStatus,
        problem_url: finalNewProbURL,
        revisit_date: finalNewProbDate
    };

    return problemData;
}

//to add new problem to the database
async function addNewProblem(problemData) {
    try {
        const response = await fetch("/api/problems", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(problemData)
        });

        const data = await response.json();

        showMessage(data);

        if (!response.ok) return;

        newProblemNo.value = "";
        newProblemName.value = "";
        newProblemDifficulty.value = "";
        newProblemStatus.value = "";
        newProblemURL.value = "";
        newRevisitDate.value = "";

        newProblemContainer.close();

    } catch {
        let msg = {
            message: "Unnable to connect to the server"
        };
        showMessage(msg);
    }
}
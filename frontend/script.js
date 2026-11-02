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
        console.error(error);
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
        console.error(error);
        showMessage(error.message);
    }
}

//initial call 
loadDueProblems();

// ==== END OF DUE PROBLEMS ==== 

// ==== SEARCH PROBLEMS ====

// selecting elements for search section
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchList = document.getElementById("search-list");

// eleements for search problem dialog
const searchProblemDialog = document.getElementById("search-problem-dialog");
const searchProblemNo = document.getElementById("search-problem-no");
const searchProblemName = document.getElementById("search-problem-name");
const searchProblemDifficulty = document.getElementById("search-problem-difficulty");
const searchProblemURL = document.getElementById("search-problem-url");
const searchRevisitDate = document.getElementById("search-revisit-date");
const searchRevisitCount = document.getElementById("search-revisit-count");
const searchRevisitOpen = document.getElementById("search-revisit-open");
const searchClose = document.getElementById("search-close");
let selectedProblem = null;

// to get search problems
async function getSearchProblems(query) {
    const safeInput = encodeURIComponent(query);
    const response = await fetch(`/api/problems/search?q=${safeInput}`);
        
    let result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(result?.message || `Server responded with status: ${response.status}`);
    } else {
        return result;
    }
}

// to open the search prolbem dialog
function openProblemDialog(problem) {
    selectedProblem = problem;

    searchProblemDialog.showModal();

    searchProblemNo.querySelector("span").textContent = problem.problem_no;
    searchProblemName.querySelector("span").textContent = problem.problem_name;
    searchProblemDifficulty.querySelector("span").textContent = problem.problem_difficulty;
    searchRevisitCount.querySelector("span").textContent = problem.revisit_count;

    searchProblemURL.hidden = problem.problem_url === null;
    if (problem.problem_url !== null) {
        searchProblemURL.querySelector("span a").href = problem.problem_url;
    }

    if (problem.revisit_date !== null) {
        searchRevisitDate.querySelector("span").textContent = problem.revisit_date;
    } else {
        searchRevisitDate.querySelector("span").textContent = "none";
    }
    
}

// to render the list of search problems in ul
function renderSearchProblems(problems) {
    searchList.replaceChildren();
    
    if (problems.length === 0) {
        const searchMessage = document.createElement("p");
        searchMessage.textContent = "No problems were found";
        
        const searchLi = document.createElement("li");
        searchLi.append(searchMessage);

        searchList.append(searchLi);

        return;
    } 

    for (const problem of problems) {
        const problemBtn = document.createElement("button");
        const problemTitle = document.createElement("span");
        const searchLi = document.createElement("li");
        
        problemBtn.type = "button";
        problemTitle.textContent = `${problem.problem_no}. ${problem.problem_name}`;
        
        problemBtn.append(problemTitle);
        searchLi.append(problemBtn);
        searchList.append(searchLi);


        problemBtn.addEventListener("click", () => {
            openProblemDialog(problem);
        });
    }
}

// to call the getSearchProblem and renderSearchProblem
async function loadSearchProblems(query) {
    try {
        const problems = await getSearchProblems(query);
        renderSearchProblems(problems);
    } catch (error) {
        console.error(error);
        showMessage(error);
    }
}

searchRevisitOpen.addEventListener("click", () => {
    searchProblemDialog.close();
    openRevisionDialog(selectedProblem);
});

searchClose.addEventListener("click", () => {
    searchProblemDialog.close();
});

// when search form is submitted
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();
    
    if (query === "") return;

    loadSearchProblems(query);
})

// ==== END OF SEARCH PROBLEM ====

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
// ==== SHARED FUNCTIONS ====

// to show messages (both success and error)
let messageTimer = null;
function showMessage(message, status = "success") {
    clearTimeout(messageTimer);

    const pageMessage = document.getElementById("page-message");
    pageMessage.textContent = message;

    if (status === "error") {
        pageMessage.setAttribute("role", "alert");
        pageMessage.dataset.type = "error";
    } else {
        pageMessage.setAttribute("role", "status");
        pageMessage.dataset.type = "success";
    }

    const delay = status === "error" ? 6000 : 4000;
    messageTimer = setTimeout(() => {
        pageMessage.textContent = "";
    }, delay);
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
    editMessage.textContent = "";

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

    let result = await response.json().catch(() => null);

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
        loadDueProblems();
        revisionDialog.close();
        showMessage(response.message);
    } catch (error) {
        console.error(error.message);
        editMessage.textContent = error.message;
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
        console.error(error.message);
        showMessage(error.message, "error");
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
        console.error(error.message);
        showMessage(error.message, "error");
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

// ==== ADD NEW PROBLEM ====

// selecting elements for add problem section
const addProblemForm = document.getElementById("add-problem-form");

async function addNewProblem(problemOject) {
    const response = await fetch("/api/problems", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(problemOject)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(result?.message || `Server responded with status: ${response.status}`);
    }

    return result;
}

async function submitNewProblems(problemObject) {
    try {
        const result = await addNewProblem(problemObject);
        showMessage(result.message);
        addProblemForm.reset();
    } catch (error){
        console.error(error.message);
        showMessage(error.message, "error");
    }
}

addProblemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(addProblemForm);
    const problemObject = Object.fromEntries(formData);

    problemObject.problem_name = problemObject.problem_name.trim();

    submitNewProblems(problemObject);
});

// ==== END OF ADD NEW PROBLEM ====
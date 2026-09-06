const addBtn = document.getElementById("add-problem-btn");
const modal = document.getElementById("add-problem-modal");
const closeBtn = document.getElementById("cancel-modal-btn");
const form = document.querySelector("form");
const problemNameInput = document.getElementById("problem-name");
const urlInput = document.getElementById("url");
const dateInput = document.getElementById("date");
const difficultyInput = document.getElementById("difficulty");

addBtn.addEventListener("click", function(){
    modal.showModal();
});
closeBtn.addEventListener("click", function(){
    modal.close();
});
form.addEventListener("submit", function(event){
    event.preventDefault();
    
    const newProblem = {
        title: problemNameInput.value,
        url: urlInput.value,
        revisitDate: dateInput.value,
        difficulty: difficultyInput.value
    };

    console.log(newProblem);
});
const problems = [
    {
        title: "Two Sum",
        difficulty: "Easy"
    },
    {
        title: "Reverse a List",
        difficulty: "Easy"
    },
    {
        title: "3Sum",
        difficulty: "Medium"
    }
];

const list = document.querySelector("#problem-list");

for (const problem of problems) {
    const li = document.createElement("li");
    const card = document.createElement("div");
    const title = document.createElement("span");
    const difficulty = document.createElement("span");

    card.classList.add("card");
    title.textContent = problem.title;
    difficulty.textContent = problem.difficulty;
    difficulty.classList.add(problem.difficulty.toLowerCase());

    li.append(card);
    card.append(title, difficulty);
    list.append(li);
}
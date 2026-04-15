const GROUP_COUNT = 12;
const PROBLEMS_PER_GROUP = 12;
const RANDOM_MIN = 0;
const RANDOM_MAX = 11;

const worksheet = document.getElementById("worksheet");
const groupTemplate = document.getElementById("group-template");
const problemTemplate = document.getElementById("problem-template");
const generateButton = document.getElementById("generate-button");
const printButton = document.getElementById("print-button");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProblem(fixedFactor) {
  const randomFactor = randomInt(RANDOM_MIN, RANDOM_MAX);
  const fixedOnTop = Math.random() < 0.5;
  const topValue = fixedOnTop ? fixedFactor : randomFactor;
  const bottomValue = fixedOnTop ? randomFactor : fixedFactor;

  return {
    topValue,
    bottomValue,
  };
}

function renderProblem(problem) {
  const fragment = problemTemplate.content.cloneNode(true);
  fragment.querySelector(".factor-top").textContent = problem.topValue;
  fragment.querySelector(".factor-value").textContent = problem.bottomValue;
  return fragment;
}

function renderGroup(fixedFactor) {
  const fragment = groupTemplate.content.cloneNode(true);
  fragment.querySelector(".group-label").textContent = `${fixedFactor} times table`;

  const grid = fragment.querySelector(".problem-grid");

  for (let index = 0; index < PROBLEMS_PER_GROUP; index += 1) {
    grid.appendChild(renderProblem(createProblem(fixedFactor)));
  }

  return fragment;
}

function renderWorksheet() {
  worksheet.replaceChildren();

  for (let fixedFactor = 0; fixedFactor < GROUP_COUNT; fixedFactor += 1) {
    worksheet.appendChild(renderGroup(fixedFactor));
  }
}

generateButton.addEventListener("click", renderWorksheet);
printButton.addEventListener("click", () => window.print());

renderWorksheet();

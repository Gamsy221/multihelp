const GROUP_COUNT = 12;
const PROBLEMS_PER_GROUP = 12;
const RANDOM_MIN = 0;
const RANDOM_MAX = 11;
const TEN_GROUP_RANDOM_MAX = 1000;
const SECTION_SECONDS = 85;

const worksheet = document.getElementById("worksheet");
const groupTemplate = document.getElementById("group-template");
const problemTemplate = document.getElementById("problem-template");
const generateButton = document.getElementById("generate-button");
const printButton = document.getElementById("print-button");
const overallResults = document.getElementById("overall-results");
const overallProblems = document.getElementById("overall-problems");
const overallGroups = document.getElementById("overall-groups");

let sections = [];
let activeTimerId = null;
let activeSectionIndex = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(secondsRemaining) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function createProblem(fixedFactor) {
  const maxRandomFactor = fixedFactor === 10 ? TEN_GROUP_RANDOM_MAX : RANDOM_MAX;
  const randomFactor = randomInt(RANDOM_MIN, maxRandomFactor);
  const fixedOnTop = Math.random() < 0.5;
  const topValue = fixedOnTop ? fixedFactor : randomFactor;
  const bottomValue = fixedOnTop ? randomFactor : fixedFactor;

  return {
    topValue,
    bottomValue,
    correctAnswer: topValue * bottomValue,
    userAnswer: "",
    isCorrect: null,
  };
}

function createSection(fixedFactor, index) {
  return {
    fixedFactor,
    index,
    state: index === 0 ? "ready" : "locked",
    remainingSeconds: SECTION_SECONDS,
    score: 0,
    isPerfect: false,
    problems: Array.from({ length: PROBLEMS_PER_GROUP }, () => createProblem(fixedFactor)),
    elements: null,
  };
}

function sanitizeAnswer(value) {
  return value.replace(/[^\d]/g, "");
}

function clearActiveTimer() {
  if (activeTimerId !== null) {
    clearInterval(activeTimerId);
    activeTimerId = null;
  }
}

function updateOverallResults() {
  const allGraded = sections.length > 0 && sections.every((section) => section.state === "graded");

  if (!allGraded) {
    overallResults.classList.add("hidden");
    overallProblems.textContent = "";
    overallGroups.textContent = "";
    return;
  }

  const totalCorrectProblems = sections.reduce((total, section) => total + section.score, 0);
  const perfectSections = sections.filter((section) => section.isPerfect).length;

  overallProblems.textContent = `Problems correct: ${totalCorrectProblems} / ${GROUP_COUNT * PROBLEMS_PER_GROUP}`;
  overallGroups.textContent = `Perfect sections: ${perfectSections} / ${GROUP_COUNT}`;
  overallResults.classList.remove("hidden");
}

function updateSectionUI(section) {
  const { root, statusPill, timerDisplay, startButton, finishButton, feedback, checkMark, note, inputs } = section.elements;

  root.dataset.state = section.state;
  timerDisplay.textContent = formatTime(section.remainingSeconds);

  if (section.state === "locked") {
    statusPill.textContent = "Locked";
    note.textContent = "Finish the earlier section to unlock this one.";
    startButton.disabled = true;
    startButton.classList.remove("hidden");
    finishButton.classList.add("hidden");
    feedback.textContent = "";
  } else if (section.state === "ready") {
    statusPill.textContent = "Ready";
    note.textContent = "Start the timer to unlock this section.";
    startButton.disabled = false;
    startButton.classList.remove("hidden");
    finishButton.classList.add("hidden");
    feedback.textContent = "";
  } else if (section.state === "active") {
    statusPill.textContent = "In Progress";
    note.textContent = "Answer the problems before the timer runs out.";
    startButton.classList.add("hidden");
    finishButton.classList.remove("hidden");
    feedback.textContent = "Timer is running.";
  } else if (section.state === "graded") {
    statusPill.textContent = section.isPerfect ? "Perfect" : "Completed";
    note.textContent = section.isPerfect ? "Every answer was correct." : "Review the highlighted answers below.";
    startButton.classList.add("hidden");
    finishButton.classList.add("hidden");
    feedback.textContent = `Score: ${section.score} / ${PROBLEMS_PER_GROUP}`;
  }

  checkMark.classList.toggle("hidden", !section.isPerfect);

  inputs.forEach((input, problemIndex) => {
    const problem = section.problems[problemIndex];
    input.disabled = section.state !== "active";
    input.value = problem.userAnswer;
    input.classList.toggle("is-correct", section.state === "graded" && problem.isCorrect === true);
    input.classList.toggle("is-wrong", section.state === "graded" && problem.isCorrect === false);
  });
}

function unlockNextSection(currentIndex) {
  const nextSection = sections[currentIndex + 1];
  if (nextSection && nextSection.state === "locked") {
    nextSection.state = "ready";
    updateSectionUI(nextSection);
  }
}

function gradeSection(sectionIndex) {
  const section = sections[sectionIndex];
  if (!section || section.state === "graded") {
    return;
  }

  clearActiveTimer();
  activeSectionIndex = null;

  let score = 0;

  section.problems.forEach((problem) => {
    const answerValue = sanitizeAnswer(problem.userAnswer);
    const numericAnswer = answerValue === "" ? null : Number(answerValue);
    problem.userAnswer = answerValue;
    problem.isCorrect = numericAnswer === problem.correctAnswer;

    if (problem.isCorrect) {
      score += 1;
    }
  });

  section.score = score;
  section.isPerfect = score === PROBLEMS_PER_GROUP;
  section.state = "graded";

  updateSectionUI(section);
  unlockNextSection(sectionIndex);
  updateOverallResults();
}

function tickActiveSection() {
  if (activeSectionIndex === null) {
    return;
  }

  const section = sections[activeSectionIndex];
  if (!section || section.state !== "active") {
    clearActiveTimer();
    activeSectionIndex = null;
    return;
  }

  section.remainingSeconds -= 1;

  if (section.remainingSeconds <= 0) {
    section.remainingSeconds = 0;
    updateSectionUI(section);
    gradeSection(activeSectionIndex);
    return;
  }

  updateSectionUI(section);
}

function startSection(sectionIndex) {
  const section = sections[sectionIndex];

  if (!section || section.state !== "ready" || activeSectionIndex !== null) {
    return;
  }

  section.state = "active";
  section.remainingSeconds = SECTION_SECONDS;
  activeSectionIndex = sectionIndex;
  updateSectionUI(section);

  activeTimerId = setInterval(tickActiveSection, 1000);
}

function createProblemElement(section, problem, problemIndex) {
  const fragment = problemTemplate.content.cloneNode(true);
  fragment.querySelector(".factor-top").textContent = problem.topValue;
  fragment.querySelector(".factor-value").textContent = problem.bottomValue;

  const input = fragment.querySelector(".answer-input");
  input.setAttribute("aria-label", `${problem.topValue} times ${problem.bottomValue}`);
  input.addEventListener("input", (event) => {
    const sanitized = sanitizeAnswer(event.target.value);
    event.target.value = sanitized;
    section.problems[problemIndex].userAnswer = sanitized;
  });

  section.elements.inputs.push(input);

  return fragment;
}

function renderSection(section) {
  const fragment = groupTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".times-group");
  const label = fragment.querySelector(".group-label");
  const statusPill = fragment.querySelector(".status-pill");
  const timerDisplay = fragment.querySelector(".timer-display");
  const startButton = fragment.querySelector(".start-button");
  const finishButton = fragment.querySelector(".finish-button");
  const feedback = fragment.querySelector(".group-feedback");
  const note = fragment.querySelector(".group-note");
  const checkMark = fragment.querySelector(".section-check");
  const grid = fragment.querySelector(".problem-grid");

  label.textContent = `${section.fixedFactor} times table`;

  section.elements = {
    root,
    statusPill,
    timerDisplay,
    startButton,
    finishButton,
    feedback,
    note,
    checkMark,
    inputs: [],
  };

  section.problems.forEach((problem, problemIndex) => {
    grid.appendChild(createProblemElement(section, problem, problemIndex));
  });

  startButton.addEventListener("click", () => startSection(section.index));
  finishButton.addEventListener("click", () => gradeSection(section.index));

  updateSectionUI(section);

  return fragment;
}

function renderWorksheet() {
  worksheet.replaceChildren();

  sections.forEach((section) => {
    worksheet.appendChild(renderSection(section));
  });

  updateOverallResults();
}

function buildNewTest() {
  clearActiveTimer();
  activeSectionIndex = null;
  sections = Array.from({ length: GROUP_COUNT }, (_, index) => createSection(index, index));
  renderWorksheet();
}

generateButton.addEventListener("click", buildNewTest);
printButton.addEventListener("click", () => window.print());

buildNewTest();

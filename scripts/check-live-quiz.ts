import {
  POINTS_SCALE,
  awardTie,
  cleanQuestion,
  formatScaled,
  isQuizVideoRef,
  judgeAnswer,
  pointsScaled,
  questionReady,
  rankStandings,
  type QuestionInput,
} from "../src/lib/live-quiz";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const samples: [number, number, number, number][] = [
  [4, 5, 100, 80],
  [5, 6, 100, 500 / 6],
  [5, 5, 100, 100],
  [4, 6, 100, 400 / 6],
];

for (const [correct, roster, points, expected] of samples) {
  const actual = pointsScaled(correct, roster, points) / POINTS_SCALE;
  assert(Math.abs(actual - expected) < 1e-9, `${correct}/${roster} expected ${expected} got ${actual}`);
}

assert(formatScaled(pointsScaled(5, 6, 100)) === "83.33", "5/6 display");
assert(formatScaled(pointsScaled(4, 6, 100)) === "66.67", "4/6 display");
assert(formatScaled(pointsScaled(4, 5, 100)) === "80.00", "4/5 display");
assert(pointsScaled(1, 3, 100) === pointsScaled(2, 6, 100), "equal ratios stay equal");

const tiedFirst = rankStandings([
  { teamId: "a", teamName: "1조", rosterSize: 5, totalScaled: 100 },
  { teamId: "b", teamName: "2조", rosterSize: 6, totalScaled: 100 },
  { teamId: "c", teamName: "3조", rosterSize: 5, totalScaled: 40 },
]);
assert(tiedFirst[0]?.rank === 1 && tiedFirst[1]?.rank === 1 && tiedFirst[2]?.rank === 3, "shared first rank");
assert(awardTie(tiedFirst).first, "first-place tie");

const tiedSecond = rankStandings([
  { teamId: "a", teamName: "1조", rosterSize: 5, totalScaled: 200 },
  { teamId: "b", teamName: "2조", rosterSize: 6, totalScaled: 100 },
  { teamId: "c", teamName: "3조", rosterSize: 5, totalScaled: 100 },
]);
assert(!awardTie(tiedSecond).first && awardTie(tiedSecond).second, "second-place tie");

const short: QuestionInput = {
  kind: "short",
  prompt: "",
  options: [],
  correctOptionId: null,
  acceptedAnswers: ["하나 그린", "Hana Green"],
  ignoreSpaces: true,
  timeLimit: 30,
  points: 100,
  explanation: "",
  imageData: null,
};
assert(judgeAnswer(short, { text: "  하나그린 " }), "ignore spaces");
assert(judgeAnswer(short, { text: "hana green" }), "ignore case");
assert(!judgeAnswer(short, { text: "하나" }), "no partial match");
assert(judgeAnswer({ ...short, kind: "choice", correctOptionId: "b" }, { optionId: "b" }), "choice match");
assert(!judgeAnswer({ ...short, kind: "choice", correctOptionId: "b" }, { optionId: "a" }), "choice miss");

const two = cleanQuestion({
  kind: "choice",
  prompt: "고르세요",
  options: [
    { id: "a", text: "", imageData: "data:image/jpeg;base64,aa" },
    { id: "b", text: "오른쪽" },
  ],
  correctOptionId: "a",
  timeLimit: 30,
  points: 100,
});
assert(typeof two !== "string" && two.options.length === 2, "two choices");
if (typeof two !== "string") assert(questionReady(two) === null, "photo choice is ready");
assert(typeof cleanQuestion({ kind: "choice", prompt: "x", options: [{ id: "a", text: "하나" }], timeLimit: 30, points: 100 }) === "string", "reject one choice");

const videoRef = "storage:quiz-media/clips/11111111-1111-4111-8111-111111111111.mp4";
assert(isQuizVideoRef(videoRef), "video ref");
assert(!isQuizVideoRef("storage:quiz-media/clips/../secret.mp4"), "reject video path escape");
const withVideo = cleanQuestion({
  kind: "choice",
  prompt: "영상 맞추기",
  options: [
    { id: "a", text: "하나" },
    { id: "b", text: "둘" },
  ],
  correctOptionId: "a",
  timeLimit: 30,
  points: 100,
  imageData: videoRef,
});
assert(typeof withVideo !== "string" && withVideo.imageData === videoRef, "question video");

console.log("quiz-checks-ok");

import {
  POINTS_SCALE,
  awardTie,
  cleanQuestion,
  formatScaled,
  isQuizVideoRef,
  judgeAnswer,
  pointsScaled,
  teamPointsScaled,
  buildAnswerSpread,
  buildIndividualSummary,
  cleanNickname,
  nicknameKey,
  publishBlocker,
  questionReady,
  rankStandings,
  type QuestionInput,
} from "../src/lib/live-quiz";
import { QUIZ_SAMPLES, recommendedSamples } from "../src/lib/live-quiz-samples";

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
assert(teamPointsScaled("individual", 5, 5, 100) === 0, "individual points stay out of the team total");
assert(teamPointsScaled("team", 4, 5, 100) === pointsScaled(4, 5, 100), "team points stay on the team total");

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
  scope: "team",
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
if (typeof withVideo !== "string") {
  const solo = cleanQuestion({ ...withVideo, scope: "individual" });
  assert(typeof solo !== "string" && solo.scope === "individual", "individual round");
}
const plain = cleanQuestion({ kind: "choice", prompt: "x", options: [{ id: "a", text: "하나" }, { id: "b", text: "둘" }], correctOptionId: "a", timeLimit: 30, points: 100 });
assert(typeof plain !== "string" && plain.scope === "team", "missing scope defaults to team");
assert(QUIZ_SAMPLES.length === 27, "twenty seven samples");
const recommended = recommendedSamples();
assert(recommended.length === 10, "ten recommended");
const soloSlots = recommended.map((sample, index) => (sample.question.scope === "individual" ? index + 1 : 0)).filter(Boolean);
assert(soloSlots.join(",") === "3,6,9", "individual rounds sit in the middle at 3, 6, 9");
assert(recommended[2].question.kind === "short" && recommended[2].question.acceptedAnswers[0] === "꾀꼬리", "third round is the oriole question");
assert(recommended[9].question.scope === "team", "the finale counts for the teams");
assert(recommended.filter((sample) => sample.videoPath).length >= 4, "recommended set keeps the video rounds");
assert(recommended.every((sample) => questionReady(sample.question) === null), "recommended rounds are playable");
assert(publishBlocker(recommended.map((sample) => sample.question), [{ name: "1조", expectedSize: 5 }, { name: "2조", expectedSize: 5 }]) === null, "recommended set can be published");
assert(new Set(QUIZ_SAMPLES.map((sample) => sample.id)).size === 27, "unique sample ids");
for (const sample of QUIZ_SAMPLES) assert(questionReady(sample.question) === null, `${sample.id} is playable`);
assert(QUIZ_SAMPLES.some((sample) => sample.question.scope === "individual"), "samples include individual rounds");
assert(QUIZ_SAMPLES.filter((sample) => sample.imagePath).length === 4, "four picture rounds");
const oriole = QUIZ_SAMPLES.find((sample) => sample.id === "bird-oriole");
assert(oriole?.question.kind === "short" && oriole.question.acceptedAnswers[0] === "꾀꼬리", "oriole is a short answer");
const race = QUIZ_SAMPLES.find((sample) => sample.id === "race-second");
assert(race?.question.options.length === 2 && race.question.options.find((option) => option.id === race.question.correctOptionId)?.text === "2등", "passing second place stays second");
const videoSamples = QUIZ_SAMPLES.filter((sample) => sample.videoPath);
assert(videoSamples.length === 5, "five video rounds");
for (const sample of videoSamples) {
  const correct = sample.question.options.find((option) => option.id === sample.question.correctOptionId)?.text;
  const expectsAi = sample.videoPath?.includes("fake");
  assert(correct === (expectsAi ? "AI" : "실제"), `${sample.id} answer follows the file name`);
}

const choiceSpread = buildAnswerSpread({
  kind: "choice",
  options: [{ id: "a", text: "1등" }, { id: "b", text: "2등" }],
  correctOptionId: "b",
  answerLabel: "2등",
  roster: 4,
  answers: [
    { optionId: "a", text: "", correct: false },
    { optionId: "a", text: "", correct: false },
    { optionId: "b", text: "", correct: true },
  ],
});
assert(choiceSpread?.total === 4 && choiceSpread.correct === 1 && choiceSpread.missed === 1, "choice rate uses the locked roster");
assert(choiceSpread?.buckets.find((bucket) => bucket.label === "2등")?.correct === true, "correct choice is marked");
assert(choiceSpread?.buckets.find((bucket) => bucket.label === "1등")?.count === 2, "wrong choice is counted");
assert(choiceSpread?.buckets.at(-1)?.label === "무응답" && choiceSpread.buckets.at(-1)?.count === 1, "missed answers are shown");
const shortSpread = buildAnswerSpread({
  kind: "short",
  options: [],
  correctOptionId: null,
  answerLabel: "꾀꼬리",
  roster: 4,
  answers: [
    { optionId: null, text: "꾀꼬리", correct: true },
    { optionId: null, text: "참새", correct: false },
    { optionId: null, text: "참 새", correct: false },
  ],
});
assert(shortSpread?.buckets.find((bucket) => bucket.label === "참새")?.count === 2, "spaced wrong answers group");
const crowded = buildAnswerSpread({
  kind: "short",
  options: [],
  correctOptionId: null,
  answerLabel: "정답",
  roster: 7,
  answers: ["가", "나", "다", "라", "마", "바", "사"].map((text) => ({ optionId: null, text, correct: false })),
});
assert(crowded?.buckets.some((bucket) => bucket.label === "그 외 오답") === true, "extra wrong answers collapse");
assert(buildAnswerSpread({ kind: "choice", options: [], correctOptionId: null, answerLabel: "", roster: 0, answers: [] }) === null, "empty room has no spread");

assert(cleanNickname("  꾀꼬리   왕 ") === "꾀꼬리 왕", "nickname collapses spaces");
assert(cleanNickname("") === null && cleanNickname("   ") === null, "blank nickname rejected");
assert(cleanNickname("열두글자를넘기는닉네임입니다") === null, "long nickname rejected");
assert(cleanNickname("a<b") === null, "angle bracket rejected");
assert(nicknameKey("Kim  A") === nicknameKey("kimA"), "nickname key ignores case and spaces");

const people = [
  { id: "p1", nickname: "하나", teamName: "1조" },
  { id: "p2", nickname: "둘", teamName: "2조" },
  { id: "p3", nickname: "셋", teamName: "1조" },
];
assert(buildIndividualSummary(0, people, new Map()) === null, "no individual round, no summary");
const allSummary = buildIndividualSummary(3, people, new Map([["p1", 3], ["p2", 2], ["p3", 3]]));
assert(allSummary?.perfect.map((row) => row.nickname).join(",") === "셋,하나", "perfect = every individual question, sorted by team then nickname");
const noneSummary = buildIndividualSummary(3, people, new Map([["p1", 2], ["p2", 2], ["p3", 1]]));
assert(noneSummary?.perfect.length === 0 && noneSummary.topCorrect === 2 && noneSummary.top.length === 2, "no perfect falls back to top scorers");
const zeroSummary = buildIndividualSummary(1, people, new Map());
assert(zeroSummary?.top.length === 0 && zeroSummary.topCorrect === 0, "nobody correct has no top");

console.log("quiz-checks-ok");

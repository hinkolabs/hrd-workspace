import { type QuestionInput, type QuestionScope, emptyOptions } from "@/lib/live-quiz";

export type QuizSample = {
  id: string;
  tag: string;
  question: QuestionInput;
  imagePath?: string;
  videoPath?: string;
};

function short(scope: QuestionScope, prompt: string, answers: string[], points: number, timeLimit = 30): QuestionInput {
  return {
    scope,
    kind: "short",
    prompt,
    options: emptyOptions(),
    correctOptionId: null,
    acceptedAnswers: answers,
    ignoreSpaces: true,
    timeLimit,
    points,
    explanation: "",
    imageData: null,
  };
}

function choice(
  scope: QuestionScope,
  prompt: string,
  texts: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  points: number,
  timeLimit = 25,
): QuestionInput {
  const ids = ["a", "b", "c", "d"] as const;
  return {
    scope,
    kind: "choice",
    prompt,
    options: ids.map((id, index) => ({ id, text: texts[index], imageData: null })),
    correctOptionId: ids[correct],
    acceptedAnswers: [],
    ignoreSpaces: true,
    timeLimit,
    points,
    explanation: "",
    imageData: null,
  };
}

function pair(
  scope: QuestionScope,
  prompt: string,
  texts: [string, string],
  correct: 0 | 1,
  points: number,
  timeLimit: number,
): QuestionInput {
  const ids = ["a", "b"] as const;
  return {
    scope,
    kind: "choice",
    prompt,
    options: ids.map((id, index) => ({ id, text: texts[index], imageData: null })),
    correctOptionId: ids[correct],
    acceptedAnswers: [],
    ignoreSpaces: true,
    timeLimit,
    points,
    explanation: "",
    imageData: null,
  };
}

function videoGuess(id: string, file: string, answer: "ai" | "real", label: number, timeLimit = 30): QuizSample {
  return {
    id,
    tag: `AI 영상 ${label} · 정답 ${answer === "ai" ? "AI" : "실제"}`,
    videoPath: `/quiz-samples/${file}`,
    question: pair(
      "team",
      "영상을 보고 고르세요.\nAI가 만든 영상일까요, 실제 영상일까요?",
      ["AI", "실제"],
      answer === "ai" ? 0 : 1,
      150,
      timeLimit,
    ),
  };
}

/** 초성, 넌센스, 사진, AI 영상 맞추기. 한 행사에는 10문제까지 골라 넣는다. */
export const QUIZ_SAMPLES: QuizSample[] = [
  { id: "food-tteok", tag: "초성", question: short("team", "음식 이름입니다.\n초성을 맞히세요.\n\nㄸㅂㅇ", ["떡볶이"], 100, 25) },
  { id: "food-kimchi", tag: "초성", question: short("team", "음식 이름입니다.\n초성을 맞히세요.\n\nㄱㅊㅉㄱ", ["김치찌개"], 100, 25) },
  { id: "food-pork", tag: "초성", question: short("team", "고기 요리 이름입니다.\n초성을 맞히세요.\n\nㅅㄱㅅ", ["삼겹살"], 100, 25) },
  { id: "food-bibim", tag: "초성", question: short("team", "비벼 먹는 한식입니다.\n초성을 맞히세요.\n\nㅂㅂㅂ", ["비빔밥"], 100, 25) },
  { id: "animal-elephant", tag: "초성", question: short("team", "동물 이름입니다.\n초성을 맞히세요.\n\nㅋㄲㄹ", ["코끼리"], 100, 20) },
  { id: "animal-tiger", tag: "초성", question: short("team", "동물 이름입니다.\n초성을 맞히세요.\n\nㅎㄹㅇ", ["호랑이"], 150, 20) },
  { id: "work-remote", tag: "초성", question: short("team", "회사에 오지 않고 일하는 방식입니다.\n초성을 맞히세요.\n\nㅈㅌㄱㅁ", ["재택근무"], 150, 25) },
  { id: "work-leave", tag: "초성", question: short("team", "정시보다 빨리 퇴근하는 말입니다.\n초성을 맞히세요.\n\nㅋㅌㄱ", ["칼퇴근"], 150, 25) },
  { id: "song-gangnam", tag: "초성", question: short("team", "노래 제목입니다.\n초성을 맞히세요.\n\nㄱㄴㅅㅌㅇ", ["강남스타일"], 150, 25) },
  { id: "movie-home", tag: "초성", question: short("team", "영화 제목입니다.\n초성을 맞히세요.\n\nㄴ ㅎㄹ ㅈㅇ", ["나 홀로 집에", "나홀로집에"], 200, 30) },
  { id: "joke-cow", tag: "넌센스", question: short("team", "소가 웃으면?", ["우하하"], 100, 20) },
  { id: "joke-king", tag: "넌센스", question: short("team", "왕이 넘어지면?", ["킹콩"], 100, 20) },
  { id: "joke-fish", tag: "넌센스", question: short("team", "물고기의 반대말은?", ["불고기"], 150, 25) },
  { id: "joke-ice", tag: "넌센스", question: short("team", "도둑이 가장 싫어하는 아이스크림은?", ["누가바"], 150, 25) },
  { id: "joke-peach", tag: "넌센스", question: short("team", "세상에서 가장 뜨거운 과일은?", ["천도복숭아"], 200, 25) },
  { id: "solo-monkey", tag: "초성 · 개인전", question: short("individual", "동물 이름입니다.\n초성을 맞히세요.\n\nㅇㅅㅇ", ["원숭이"], 100, 20) },
  { id: "solo-ice", tag: "넌센스 · 개인전", question: short("individual", "얼음이 죽으면?", ["다이빙"], 100, 20) },
  {
    id: "photo-tiger",
    tag: "사진",
    imagePath: "/quiz-samples/tiger.jpg",
    question: choice("team", "사진 속 동물은 무엇일까요?", ["호랑이", "사자", "표범", "치타"], 0, 150, 20),
  },
  {
    id: "photo-tteok",
    tag: "사진",
    imagePath: "/quiz-samples/tteokbokki.jpg",
    question: choice("team", "사진 속 음식은 무엇일까요?", ["김밥", "떡볶이", "라면", "비빔밥"], 1, 150, 20),
  },
  {
    id: "photo-coffee",
    tag: "사진 · 개인전",
    imagePath: "/quiz-samples/coffee.jpg",
    question: choice("individual", "사진 속 음료는 무엇일까요?", ["녹차", "주스", "커피", "우유"], 2, 100, 15),
  },
  {
    id: "bird-oriole",
    tag: "주관식",
    imagePath: "/quiz-samples/oriole.png",
    question: short("team", "굉장히 유명하지만 의외로 초면인 새", ["꾀꼬리"], 150, 25),
  },
  {
    id: "race-second",
    tag: "2지선다",
    question: pair("team", "달리기에서 2등을 추월하면 몇 등이 될까요?", ["1등", "2등"], 1, 150, 20),
  },
  videoGuess("video-fake", "fake.mp4", "ai", 1),
  videoGuess("video-fake-2", "fake2.mp4", "ai", 2),
  videoGuess("video-real", "real.mp4", "real", 3),
  videoGuess("video-real-2", "real2.mp4", "real", 4),
  videoGuess("video-real-3", "real3.mp4", "real", 5, 35),
];

type RecommendedSlot = { id: string; individual?: boolean; points?: number };

/** 기본 10문제. 영상과 넌센스를 섞고, 3·6·9번은 개인전이다. 마지막은 조별전으로 끝낸다. */
const RECOMMENDED_SLOTS: RecommendedSlot[] = [
  { id: "video-fake", points: 100 },
  { id: "race-second", points: 100 },
  { id: "bird-oriole", individual: true },
  { id: "video-real", points: 150 },
  { id: "joke-king", points: 150 },
  { id: "solo-ice", individual: true },
  { id: "video-fake-2", points: 200 },
  { id: "joke-peach", points: 200 },
  { id: "video-real-3", individual: true },
  { id: "video-real-2", points: 250 },
];

export const RECOMMENDED_SAMPLE_IDS = RECOMMENDED_SLOTS.map((slot) => slot.id);

export function recommendedSamples(): QuizSample[] {
  return RECOMMENDED_SLOTS.map((slot) => {
    const sample = QUIZ_SAMPLES.find((item) => item.id === slot.id);
    if (!sample) throw new Error(`missing sample ${slot.id}`);
    const scope: QuestionScope = slot.individual ? "individual" : sample.question.scope;
    return {
      ...sample,
      tag: scope === "individual" && sample.question.scope !== "individual" ? `${sample.tag} · 개인전` : sample.tag,
      question: {
        ...sample.question,
        scope,
        points: slot.points ?? sample.question.points,
      },
    };
  });
}

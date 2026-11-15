export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 10;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 12;
export const MIN_TIME = 10;
export const MAX_TIME = 90;
export const DEFAULT_TIME = 30;
export const DEFAULT_POINTS = 100;
export const POINTS_SCALE = 1_000_000_000;

export const SUGGESTED_POINTS = [100, 100, 100, 150, 150, 150, 200, 250];

export type Phase = "edit" | "lobby" | "question" | "closed" | "reveal" | "final" | "ended";
export type EventStatus = "draft" | "live" | "ended" | "cancelled";
export type QuestionKind = "choice" | "short";

export type ChoiceOption = { id: string; text: string; imageData?: string | null; hasImage?: boolean };

export type QuestionInput = {
  kind: QuestionKind;
  prompt: string;
  options: ChoiceOption[];
  correctOptionId: string | null;
  acceptedAnswers: string[];
  ignoreSpaces: boolean;
  timeLimit: number;
  points: number;
  explanation: string;
  imageData: string | null;
};

export type TeamInput = { name: string; expectedSize: number };

export type StoredQuestion = QuestionInput & { id: string; sortOrder: number };

export type StoredTeam = {
  id: string;
  name: string;
  expectedSize: number;
  lockedSize: number | null;
  joined: number;
};

export type AdminEvent = {
  id: string;
  title: string;
  code: string | null;
  publicPath: string | null;
  status: EventStatus;
  phase: Phase;
  rosterLocked: boolean;
  finalStep: number;
  questions: StoredQuestion[];
  teams: StoredTeam[];
};

export type AdminListItem = {
  id: string;
  title: string;
  publicPath: string | null;
  status: EventStatus;
  phase: Phase;
  questionCount: number;
  teamCount: number;
  participantCount: number;
  createdAt: string;
};

export type Standing = {
  teamId: string;
  teamName: string;
  rosterSize: number;
  totalScaled: number;
  rank: number;
  previousRank: number | null;
};

export type TeamQuestionScore = {
  teamId: string;
  teamName: string;
  correctCount: number;
  rosterSize: number;
  pointsScaled: number;
  allCorrect: boolean;
};

export type PublicQuestion = {
  id: string;
  index: number;
  prompt: string;
  kind: QuestionKind;
  options: ChoiceOption[];
  timeLimit: number;
  points: number;
  hasImage: boolean;
  explanation: string | null;
  answerLabel: string | null;
  correctOptionId: string | null;
};

export type PublicState = {
  title: string;
  phase: Phase;
  status: EventStatus;
  rosterLocked: boolean;
  finalStep: number;
  serverNow: string;
  endsAt: string | null;
  joined: boolean;
  invalidToken: boolean;
  participant: { id: string; teamId: string; teamName: string } | null;
  teams: { id: string; name: string }[];
  question: PublicQuestion | null;
  submitted: { optionId: string | null; text: string } | null;
  myCorrect: boolean | null;
  questionResults: TeamQuestionScore[] | null;
  standings: Standing[] | null;
  ceremony: { place: 1 | 2; teams: Standing[] }[] | null;
  awardTie: { first: boolean; second: boolean };
};

export type ReviewAnswer = {
  id: string;
  teamName: string;
  optionId: string | null;
  answerText: string;
  isCorrect: boolean;
  overridden: boolean;
};

export type ConsoleState = {
  serverNow: string;
  phase: Phase;
  status: EventStatus;
  rosterLocked: boolean;
  finalStep: number;
  title: string;
  code: string | null;
  publicPath: string | null;
  participantCount: number;
  teamCount: number;
  questionCount: number;
  playedCount: number;
  endsAt: string | null;
  currentQuestion: (PublicQuestion & { acceptedAnswers: string[] }) | null;
  teams: (StoredTeam & { submitted: number })[];
  submittedCount: number;
  questionResults: TeamQuestionScore[] | null;
  standings: Standing[];
  awardTie: { first: boolean; second: boolean };
  nextIndex: number | null;
  review: ReviewAnswer[] | null;
};

export function emptyOptions(): ChoiceOption[] {
  return choiceOptions(4);
}

export function choiceOptions(count: 2 | 4, current: ChoiceOption[] = []): ChoiceOption[] {
  const ids = count === 2 ? ["a", "b"] : ["a", "b", "c", "d"];
  return ids.map((id) => {
    const found = current.find((option) => option.id === id);
    return { id, text: found?.text ?? "", imageData: found?.imageData ?? null };
  });
}

export function defaultTeams(): TeamInput[] {
  return [
    { name: "1조", expectedSize: 5 },
    { name: "2조", expectedSize: 6 },
    { name: "3조", expectedSize: 5 },
    { name: "4조", expectedSize: 6 },
  ];
}

export function defaultQuestions(): QuestionInput[] {
  return SUGGESTED_POINTS.map((points) => ({
    kind: "choice" as const,
    prompt: "",
    options: emptyOptions(),
    correctOptionId: null,
    acceptedAnswers: [],
    ignoreSpaces: true,
    timeLimit: DEFAULT_TIME,
    points,
    explanation: "",
    imageData: null,
  }));
}

export function phaseLabel(status: EventStatus, phase: Phase) {
  if (status === "cancelled") return "취소";
  if (status === "draft" || phase === "edit") return "준비";
  if (phase === "lobby") return "입장";
  if (phase === "question") return "진행";
  if (phase === "closed") return "마감";
  if (phase === "reveal") return "정답 공개";
  if (phase === "final") return "시상";
  return "종료";
}

export function formatScaled(scaled: number) {
  const rounded = Math.round(scaled / 1e7) / 100;
  return rounded.toFixed(2);
}

export function remainingSeconds(endsAt: string | null, alignedNow: number, timeLimit: number) {
  if (!endsAt) return 0;
  const ms = new Date(endsAt).getTime() - alignedNow;
  if (Number.isNaN(ms)) return 0;
  return Math.min(timeLimit, Math.max(0, Math.ceil(ms / 1000)));
}

export function pointsScaled(correct: number, roster: number, points: number) {
  if (roster <= 0 || correct <= 0 || points <= 0) return 0;
  return Math.floor((correct * points * POINTS_SCALE) / roster);
}

export function rankStandings(
  rows: { teamId: string; teamName: string; rosterSize: number; totalScaled: number }[],
): Standing[] {
  const sorted = [...rows].sort(
    (a, b) => b.totalScaled - a.totalScaled || a.teamName.localeCompare(b.teamName, "ko"),
  );
  let rank = 0;
  let seen = 0;
  let previous: number | null = null;
  return sorted.map((row) => {
    seen += 1;
    if (previous === null || row.totalScaled !== previous) {
      rank = seen;
      previous = row.totalScaled;
    }
    return { ...row, rank, previousRank: null };
  });
}

export function awardTie(standings: Standing[]) {
  const firsts = standings.filter((row) => row.rank === 1);
  if (firsts.length === 0) return { first: false, second: false };
  if (firsts.length > 1) return { first: true, second: true };
  const second = standings.find((row) => row.rank !== 1);
  if (!second) return { first: false, second: false };
  const seconds = standings.filter((row) => row.totalScaled === second.totalScaled);
  return { first: false, second: seconds.length > 1 };
}

export function applyPreviousRanks(current: Standing[], previous: Standing[]) {
  const previousRank = new Map(previous.map((row) => [row.teamId, row.rank]));
  return current.map((row) => ({
    ...row,
    previousRank: previousRank.get(row.teamId) ?? null,
  }));
}

export function normalizeAnswer(value: string, ignoreSpaces: boolean) {
  let text = value.normalize("NFKC").trim().toLowerCase().replace(/\u3000/g, " ");
  text = ignoreSpaces ? text.replace(/\s+/g, "") : text.replace(/\s+/g, " ");
  return text;
}

export function judgeAnswer(
  question: Pick<QuestionInput, "kind" | "correctOptionId" | "acceptedAnswers" | "ignoreSpaces">,
  given: { optionId?: string | null; text?: string | null },
) {
  if (question.kind === "choice") {
    return Boolean(question.correctOptionId) && given.optionId === question.correctOptionId;
  }
  const normalized = normalizeAnswer(given.text ?? "", question.ignoreSpaces);
  if (!normalized) return false;
  return question.acceptedAnswers.some(
    (answer) => normalizeAnswer(answer, question.ignoreSpaces) === normalized,
  );
}

export function answerLabel(question: Pick<QuestionInput, "kind" | "options" | "correctOptionId" | "acceptedAnswers">) {
  if (question.kind === "choice") {
    const option = question.options.find((item) => item.id === question.correctOptionId);
    if (!option) return "";
    return option.text || `보기 ${option.id.toUpperCase()}`;
  }
  return question.acceptedAnswers[0] ?? "";
}

export function isAllowedImage(data: string | null) {
  if (data == null) return true;
  return data.startsWith("data:image/jpeg;base64,") && data.length <= 900_000;
}

export function cleanTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const title = value.trim().replace(/\s+/g, " ");
  if (!title || title.length > 80) return null;
  return title;
}

export function cleanQuestions(value: unknown): QuestionInput[] | string {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_QUESTIONS) {
    return `문제는 1개에서 ${MAX_QUESTIONS}개까지 등록할 수 있습니다`;
  }
  const questions: QuestionInput[] = [];
  for (const raw of value) {
    const parsed = cleanQuestion(raw);
    if (typeof parsed === "string") return parsed;
    questions.push(parsed);
  }
  return questions;
}

export function cleanQuestion(raw: unknown): QuestionInput | string {
  if (!raw || typeof raw !== "object") return "문제 형식이 올바르지 않습니다";
  const item = raw as Record<string, unknown>;
  const kind = item.kind === "short" ? "short" : item.kind === "choice" ? "choice" : null;
  if (!kind) return "문제 유형은 객관식 또는 단답형이어야 합니다";
  const prompt = typeof item.prompt === "string" ? item.prompt.trim() : "";
  if (prompt.length > 500) return "문제 내용은 500자 이하로 입력하세요";
  const timeLimit = typeof item.timeLimit === "number" ? item.timeLimit : Number(item.timeLimit);
  if (!Number.isInteger(timeLimit) || timeLimit < MIN_TIME || timeLimit > MAX_TIME) {
    return `제한 시간은 ${MIN_TIME}초에서 ${MAX_TIME}초 사이여야 합니다`;
  }
  const points = typeof item.points === "number" ? item.points : Number(item.points);
  if (!Number.isInteger(points) || points < 1 || points > 1000) return "배점은 1점에서 1000점 사이여야 합니다";
  const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
  if (explanation.length > 500) return "해설은 500자 이하로 입력하세요";
  let imageData: string | null = null;
  if (item.imageData != null && item.imageData !== "") {
    if (typeof item.imageData !== "string" || !isAllowedImage(item.imageData)) {
      return "사진은 jpg로 줄여 저장합니다. 너무 큰 사진은 다시 올려 주세요.";
    }
    imageData = item.imageData;
  }
  const ignoreSpaces = item.ignoreSpaces !== false;
  if (kind === "choice") {
    if (!Array.isArray(item.options) || (item.options.length !== 2 && item.options.length !== 4)) {
      return "객관식은 보기 2개 또는 4개가 필요합니다";
    }
    const options: ChoiceOption[] = [];
    for (const option of item.options) {
      if (!option || typeof option !== "object") return "보기 형식이 올바르지 않습니다";
      const id = typeof (option as { id?: unknown }).id === "string" ? (option as { id: string }).id.trim() : "";
      const text = typeof (option as { text?: unknown }).text === "string" ? (option as { text: string }).text.trim() : "";
      const imageRaw = (option as { imageData?: unknown }).imageData;
      let imageData: string | null = null;
      if (typeof imageRaw === "string" && imageRaw.length > 0) {
        if (!isAllowedImage(imageRaw)) return "보기 사진은 jpg로 줄여 저장합니다. 너무 큰 사진은 다시 올려 주세요.";
        imageData = imageRaw;
      }
      if (!id || id.length > 40) return "보기 번호가 올바르지 않습니다";
      if (text.length > 80) return "보기는 80자 이하로 입력하세요";
      options.push({ id, text, imageData });
    }
    if (new Set(options.map((option) => option.id)).size !== options.length) return "보기 번호가 중복되었습니다";
    const correctOptionId = typeof item.correctOptionId === "string" ? item.correctOptionId : null;
    if (correctOptionId && !options.some((option) => option.id === correctOptionId)) {
      return "정답 보기를 다시 선택하세요";
    }
    return {
      kind,
      prompt,
      options,
      correctOptionId,
      acceptedAnswers: [],
      ignoreSpaces,
      timeLimit,
      points,
      explanation,
      imageData,
    };
  }
  const accepted = Array.isArray(item.acceptedAnswers)
    ? item.acceptedAnswers
    : typeof item.acceptedAnswers === "string"
      ? item.acceptedAnswers.split("\n")
      : [];
  const acceptedAnswers = accepted
    .filter((answer): answer is string => typeof answer === "string")
    .map((answer) => answer.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (acceptedAnswers.some((answer) => answer.length > 80)) return "단답 정답은 80자 이하로 입력하세요";
  return {
    kind,
    prompt,
    options: emptyOptions(),
    correctOptionId: null,
    acceptedAnswers,
    ignoreSpaces,
    timeLimit,
    points,
    explanation,
    imageData,
  };
}

export function questionReady(question: QuestionInput) {
  if (!question.prompt.trim()) return "문제 내용을 입력하세요";
  if (question.kind === "choice") {
    if (question.options.length !== 2 && question.options.length !== 4) return "보기는 2개 또는 4개여야 합니다";
    if (question.options.some((option) => !option.text.trim() && !option.imageData)) return "보기마다 글 또는 사진을 넣으세요";
    if (!question.correctOptionId) return "정답 보기를 선택하세요";
    return null;
  }
  if (question.acceptedAnswers.length === 0) return "단답 정답을 하나 이상 입력하세요";
  return null;
}

export function publishBlocker(questions: QuestionInput[], teams: TeamInput[]) {
  if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
    return `발행하려면 문제가 ${MIN_QUESTIONS}개에서 ${MAX_QUESTIONS}개여야 합니다`;
  }
  for (let i = 0; i < questions.length; i += 1) {
    const problem = questionReady(questions[i]);
    if (problem) return `${i + 1}번 ${problem}`;
  }
  if (teams.length < MIN_TEAMS) return `조는 ${MIN_TEAMS}개 이상 필요합니다`;
  return null;
}

export type TeamWrite = TeamInput & { id?: string };

export function cleanTeams(value: unknown): TeamWrite[] | string {
  if (!Array.isArray(value) || value.length < MIN_TEAMS || value.length > MAX_TEAMS) {
    return `조는 ${MIN_TEAMS}개에서 ${MAX_TEAMS}개까지 등록할 수 있습니다`;
  }
  const teams: TeamWrite[] = [];
  const names = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return "조 형식이 올바르지 않습니다";
    const item = raw as { id?: unknown; name?: unknown; expectedSize?: unknown };
    const name = typeof item.name === "string" ? item.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 20) return "조 이름은 20자 이하로 입력하세요";
    if (names.has(name)) return "같은 조 이름이 있습니다";
    names.add(name);
    const expectedSize = typeof item.expectedSize === "number" ? item.expectedSize : Number(item.expectedSize);
    if (!Number.isInteger(expectedSize) || expectedSize < 1 || expectedSize > 99) {
      return "예상 인원은 1명에서 99명 사이여야 합니다";
    }
    const id = typeof item.id === "string" && /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : undefined;
    teams.push({ id, name, expectedSize });
  }
  return teams;
}

export function isMissingRelation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("could not find the table") ||
    (msg.includes("schema cache") && (msg.includes("quiz_events") || msg.includes("quiz_teams")))
  );
}

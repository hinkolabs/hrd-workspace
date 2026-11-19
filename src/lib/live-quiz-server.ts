import { randomBytes, randomInt } from "crypto";
import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/auth";
import { getSessionFromCookies } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import { broadcastQuiz } from "@/lib/live-quiz-broadcast";
import { signQuizVideo } from "@/lib/quiz-video";
import { LIVE_QUIZ_SCHEMA_SQL, QUIZ_SCOPE_SQL } from "@/lib/live-quiz-schema";
import {
  type AdminEvent,
  type AdminListItem,
  type ChoiceOption,
  type ConsoleState,
  type EventStatus,
  type Phase,
  type PublicQuestion,
  type PublicState,
  type QuestionInput,
  type QuestionKind,
  type QuestionScope,
  type ReviewAnswer,
  type Standing,
  type StoredQuestion,
  type StoredTeam,
  type TeamQuestionScore,
  type TeamWrite,
  MAX_QUESTIONS,
  answerLabel,
  applyPreviousRanks,
  awardTie,
  cleanQuestion,
  cleanQuestions,
  cleanTeams,
  cleanTitle,
  defaultQuestions,
  defaultTeams,
  emptyOptions,
  isMissingRelation,
  isQuizVideoRef,
  judgeAnswer,
  teamPointsScaled,
  publishBlocker,
  questionReady,
  rankStandings,
} from "@/lib/live-quiz";

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

type EventRow = {
  id: string;
  title: string;
  code: string | null;
  public_path: string | null;
  status: EventStatus;
  phase: Phase;
  current_question_id: string | null;
  question_started_at: string | null;
  question_ends_at: string | null;
  roster_locked: boolean;
  final_step: number;
  created_at: string;
  published_at: string | null;
};

type QuestionRow = {
  id: string;
  event_id: string;
  sort_order: number;
  kind: QuestionKind;
  scope?: QuestionScope | null;
  prompt: string;
  image_data: string | null;
  has_image: boolean;
  options: ChoiceOption[] | string;
  correct_option_id: string | null;
  accepted_answers: string[] | null;
  ignore_spaces: boolean;
  time_limit: number;
  points: number;
  explanation: string | null;
};

type TeamRow = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  expected_size: number;
  locked_size: number | null;
};

type AnswerRow = {
  id: string;
  question_id: string;
  participant_id: string;
  team_id: string;
  answer_text: string;
  option_id: string | null;
  is_correct: boolean;
  override_correct: boolean | null;
  submitted_at: string;
};

type ResultRow = {
  question_id: string;
  team_id: string;
  correct_count: number;
  roster_size: number;
  points_scaled: number | string;
};

export class QuizHttpError extends Error {
  status: number;
  extra?: Record<string, unknown>;

  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = "QuizHttpError";
    this.status = status;
    this.extra = extra;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function toResponse(error: unknown) {
  if (error instanceof QuizHttpError) return json({ error: error.message, ...error.extra }, error.status);
  console.error(error);
  return json({ error: "처리하지 못했습니다" }, 500);
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new QuizHttpError(400, "요청 형식이 올바르지 않습니다");
  }
}

export function readQuizToken(req: Request) {
  return req.headers.get("x-quiz-token")?.trim() ?? "";
}

export async function requireAdminSession() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") throw new QuizHttpError(403, "관리자 권한이 필요합니다");
  return session;
}

function dbError(error: { code?: string; message: string }) {
  const message = (error.message ?? "").toLowerCase();
  if ((error.code === "PGRST204" || error.code === "42703") && message.includes("scope")) {
    return new QuizHttpError(503, `개인전 구분을 쓰려면 Supabase SQL Editor에서 이 쿼리를 실행하세요.\n${QUIZ_SCOPE_SQL}`, { needsSetup: true, sql: QUIZ_SCOPE_SQL });
  }
  if (isMissingRelation(error)) {
    return new QuizHttpError(503, "퀴즈 테이블이 없습니다. 실시간 퀴즈 화면에서 테이블을 먼저 만드세요.", { needsSetup: true });
  }
  if (error.code === "22P02") return new QuizHttpError(404, "퀴즈를 찾을 수 없습니다");
  return new QuizHttpError(500, error.message);
}

function asOptions(value: QuestionRow["options"]): ChoiceOption[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as ChoiceOption[]) : emptyOptions();
    } catch {
      return emptyOptions();
    }
  }
  return emptyOptions();
}

function toInput(row: QuestionRow): QuestionInput {
  return {
    scope: row.scope === "individual" ? "individual" : "team",
    kind: row.kind,
    prompt: row.prompt,
    options: asOptions(row.options),
    correctOptionId: row.correct_option_id,
    acceptedAnswers: row.accepted_answers ?? [],
    ignoreSpaces: row.ignore_spaces,
    timeLimit: row.time_limit,
    points: row.points,
    explanation: row.explanation ?? "",
    imageData: row.image_data,
  };
}

function scaled(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

async function loadEvent(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("quiz_events").select("*").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new QuizHttpError(404, "퀴즈를 찾을 수 없습니다");
  return data as EventRow;
}

async function loadByCode(code: string) {
  const normalized = code.toLowerCase();
  if (!/^[a-z0-9]{6}$/.test(normalized)) throw new QuizHttpError(404, "참가 주소를 찾을 수 없습니다");
  const supabase = createServerClient();
  const { data, error } = await supabase.from("quiz_events").select("*").eq("code", normalized).maybeSingle();
  if (error) throw dbError(error);
  const event = data as EventRow | null;
  if (!event || event.status === "draft") throw new QuizHttpError(404, "참가 주소를 찾을 수 없습니다");
  return event;
}

async function loadQuestions(eventId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw dbError(error);
  return (data ?? []) as QuestionRow[];
}

async function loadTeams(eventId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_teams")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw dbError(error);
  return (data ?? []) as TeamRow[];
}

async function loadResults(eventId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("quiz_question_results").select("*").eq("event_id", eventId);
  if (error) throw dbError(error);
  return ((data ?? []) as ResultRow[]).map((row) => ({ ...row, points_scaled: scaled(row.points_scaled) }));
}

async function joinedCounts(eventId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("quiz_participants").select("team_id").eq("event_id", eventId);
  if (error) throw dbError(error);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { team_id: string }[]) {
    counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
  }
  return counts;
}

async function audit(eventId: string, actor: string | null, action: string, detail: Record<string, unknown>) {
  const supabase = createServerClient();
  await supabase.from("quiz_audit_logs").insert({ event_id: eventId, actor, action, detail });
}

function questionRows(eventId: string, questions: QuestionInput[]) {
  return questions.map((question, index) => ({
    event_id: eventId,
    sort_order: index + 1,
    scope: question.scope,
    kind: question.kind,
    prompt: question.prompt,
    image_data: question.imageData,
    has_image: Boolean(question.imageData),
    options: question.kind === "choice" ? question.options : emptyOptions(),
    correct_option_id: question.kind === "choice" ? question.correctOptionId : null,
    accepted_answers: question.kind === "short" ? question.acceptedAnswers : [],
    ignore_spaces: question.ignoreSpaces,
    time_limit: question.timeLimit,
    points: question.points,
    explanation: question.explanation,
  }));
}

async function gradeQuestion(event: EventRow, question: QuestionRow) {
  const supabase = createServerClient();
  const [{ data: answerData, error: answerError }, { data: teamData, error: teamError }] = await Promise.all([
    supabase.from("quiz_answers").select("*").eq("question_id", question.id),
    supabase.from("quiz_teams").select("id, locked_size").eq("event_id", event.id),
  ]);
  if (answerError) throw dbError(answerError);
  if (teamError) throw dbError(teamError);
  const input = toInput(question);
  const answers = (answerData ?? []) as AnswerRow[];
  for (const answer of answers) {
    const auto = judgeAnswer(input, { optionId: answer.option_id, text: answer.answer_text });
    const isCorrect = answer.override_correct == null ? auto : answer.override_correct;
    if (isCorrect !== answer.is_correct) {
      const { error } = await supabase.from("quiz_answers").update({ is_correct: isCorrect }).eq("id", answer.id);
      if (error) throw dbError(error);
    }
    answer.is_correct = isCorrect;
  }
  const rows = ((teamData ?? []) as { id: string; locked_size: number | null }[]).map((team) => {
    const roster = team.locked_size ?? 0;
    const correct = answers.filter((answer) => answer.team_id === team.id && answer.is_correct).length;
    return {
      event_id: event.id,
      question_id: question.id,
      team_id: team.id,
      correct_count: correct,
      roster_size: roster,
      points_scaled: teamPointsScaled(input.scope, correct, roster, question.points),
    };
  });
  if (rows.length === 0) return;
  const { error } = await supabase.from("quiz_question_results").upsert(rows, { onConflict: "question_id,team_id" });
  if (error) throw dbError(error);
}

async function ensureClosed(event: EventRow) {
  if (event.phase !== "question" || !event.question_ends_at || !event.current_question_id) return event;
  if (Date.now() < new Date(event.question_ends_at).getTime()) return event;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_events")
    .update({ phase: "closed", updated_at: new Date().toISOString() })
    .eq("id", event.id)
    .eq("phase", "question")
    .eq("current_question_id", event.current_question_id)
    .select("*");
  if (error) throw dbError(error);
  const winner = ((data ?? []) as EventRow[])[0];
  if (!winner) return loadEvent(event.id);
  const question = (await loadQuestions(event.id)).find((item) => item.id === event.current_question_id);
  if (question) await gradeQuestion(winner, question);
  await audit(event.id, null, "auto_close", { questionId: event.current_question_id });
  await broadcastQuiz(event.code);
  return winner;
}

function buildStandings(teams: TeamRow[], results: ResultRow[], questionId: string | null, include: boolean) {
  const active = teams.filter((team) => (team.locked_size ?? 0) > 0);
  const totals = new Map(active.map((team) => [team.id, 0]));
  const previous = new Map(active.map((team) => [team.id, 0]));
  for (const result of results) {
    if (!totals.has(result.team_id)) continue;
    const points = scaled(result.points_scaled);
    const isCurrent = questionId != null && result.question_id === questionId;
    if (!isCurrent || include) totals.set(result.team_id, (totals.get(result.team_id) ?? 0) + points);
    if (!isCurrent) previous.set(result.team_id, (previous.get(result.team_id) ?? 0) + points);
  }
  const current = rankStandings(
    active.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      rosterSize: team.locked_size ?? 0,
      totalScaled: totals.get(team.id) ?? 0,
    })),
  );
  const before = rankStandings(
    active.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      rosterSize: team.locked_size ?? 0,
      totalScaled: previous.get(team.id) ?? 0,
    })),
  );
  return applyPreviousRanks(current, before);
}

function questionScores(teams: TeamRow[], results: ResultRow[], questionId: string): TeamQuestionScore[] {
  return teams
    .filter((team) => (team.locked_size ?? 0) > 0)
    .map((team) => {
      const result = results.find((item) => item.question_id === questionId && item.team_id === team.id);
      const correctCount = result?.correct_count ?? 0;
      const rosterSize = result?.roster_size ?? team.locked_size ?? 0;
      return {
        teamId: team.id,
        teamName: team.name,
        correctCount,
        rosterSize,
        pointsScaled: result ? scaled(result.points_scaled) : 0,
        allCorrect: rosterSize > 0 && correctCount === rosterSize,
      };
    });
}

function toPublicQuestion(row: QuestionRow, revealed: boolean): PublicQuestion {
  const input = toInput(row);
  return {
    id: row.id,
    index: row.sort_order,
    scope: input.scope,
    prompt: row.prompt,
    kind: row.kind,
    options: input.options.map((option) => ({
      id: option.id,
      text: option.text,
      hasImage: Boolean(option.imageData),
    })),
    timeLimit: row.time_limit,
    points: row.points,
    hasImage: row.has_image,
    explanation: revealed ? input.explanation || null : null,
    answerLabel: revealed ? answerLabel(input) : null,
    correctOptionId: revealed ? input.correctOptionId : null,
  };
}

async function allocateCode() {
  const supabase = createServerClient();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const { data, error } = await supabase.from("quiz_events").select("id").eq("code", code).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return code;
  }
  throw new QuizHttpError(500, "참가 코드를 만들지 못했습니다");
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") throw new QuizHttpError(400, "요청 형식이 올바르지 않습니다");
  const raw = body as { title?: unknown; teams?: unknown; questions?: unknown };
  const title = cleanTitle(raw.title);
  if (!title) throw new QuizHttpError(400, "제목은 80자 이하로 입력하세요");
  const teams = raw.teams == null ? defaultTeams() : cleanTeams(raw.teams);
  if (typeof teams === "string") throw new QuizHttpError(400, teams);
  const questions = raw.questions == null ? defaultQuestions() : cleanQuestions(raw.questions);
  if (typeof questions === "string") throw new QuizHttpError(400, questions);
  return { title, teams, questions };
}

async function storedTeams(eventId: string): Promise<StoredTeam[]> {
  const [teams, counts] = await Promise.all([loadTeams(eventId), joinedCounts(eventId)]);
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    expectedSize: team.expected_size,
    lockedSize: team.locked_size,
    joined: counts.get(team.id) ?? 0,
  }));
}

async function storedQuestions(eventId: string): Promise<StoredQuestion[]> {
  return (await loadQuestions(eventId)).map((row) => ({ id: row.id, sortOrder: row.sort_order, ...toInput(row) }));
}

export async function listQuizzes() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_events")
    .select("id, title, public_path, status, phase, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingRelation(error)) {
      return { needsSetup: true, sql: LIVE_QUIZ_SCHEMA_SQL.trim(), quizzes: [] as AdminListItem[] };
    }
    throw dbError(error);
  }
  const events = (data ?? []) as Pick<EventRow, "id" | "title" | "public_path" | "status" | "phase" | "created_at">[];
  const ids = events.map((event) => event.id);
  const questions = new Map<string, number>();
  const teams = new Map<string, number>();
  const people = new Map<string, number>();
  if (ids.length > 0) {
    const [questionRes, teamRes, peopleRes] = await Promise.all([
      supabase.from("quiz_questions").select("event_id").in("event_id", ids),
      supabase.from("quiz_teams").select("event_id").in("event_id", ids),
      supabase.from("quiz_participants").select("event_id").in("event_id", ids),
    ]);
    if (questionRes.error) throw dbError(questionRes.error);
    if (teamRes.error) throw dbError(teamRes.error);
    if (peopleRes.error) throw dbError(peopleRes.error);
    for (const row of (questionRes.data ?? []) as { event_id: string }[]) questions.set(row.event_id, (questions.get(row.event_id) ?? 0) + 1);
    for (const row of (teamRes.data ?? []) as { event_id: string }[]) teams.set(row.event_id, (teams.get(row.event_id) ?? 0) + 1);
    for (const row of (peopleRes.data ?? []) as { event_id: string }[]) people.set(row.event_id, (people.get(row.event_id) ?? 0) + 1);
  }
  const quizzes: AdminListItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    publicPath: event.public_path,
    status: event.status,
    phase: event.phase,
    questionCount: questions.get(event.id) ?? 0,
    teamCount: teams.get(event.id) ?? 0,
    participantCount: people.get(event.id) ?? 0,
    createdAt: event.created_at,
  }));
  return { needsSetup: false, quizzes };
}

export async function setupLiveQuizTables() {
  const supabase = createServerClient();
  const ready = async () => !(await supabase.from("quiz_events").select("id").limit(1)).error;
  if (await ready()) return { ok: true as const };
  await supabase.rpc("exec_sql", { query: LIVE_QUIZ_SCHEMA_SQL });
  if (await ready()) return { ok: true as const };
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace("https://", "").split(".")[0];
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (projectRef && serviceKey) {
    try {
      await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ query: LIVE_QUIZ_SCHEMA_SQL }),
      });
    } catch {
      /* SQL을 화면에 보여 준다 */
    }
  }
  if (await ready()) return { ok: true as const };
  return {
    ok: false as const,
    message: "자동으로 테이블을 만들지 못했습니다. 아래 SQL을 Supabase SQL Editor에서 실행한 뒤 새로고침해 주세요.",
    sql: LIVE_QUIZ_SCHEMA_SQL.trim(),
  };
}

export async function getAdminQuiz(id: string): Promise<AdminEvent> {
  const event = await loadEvent(id);
  const [questions, teams] = await Promise.all([storedQuestions(id), storedTeams(id)]);
  return {
    id: event.id,
    title: event.title,
    code: event.code,
    publicPath: event.public_path,
    status: event.status,
    phase: event.phase,
    rosterLocked: event.roster_locked,
    finalStep: event.final_step,
    questions,
    teams,
  };
}

export async function createQuiz(session: SessionPayload, body: unknown) {
  const parsed = parseBody(body);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_events")
    .insert({ title: parsed.title, status: "draft", phase: "edit", created_by: session.displayName })
    .select("id")
    .single();
  if (error) throw dbError(error);
  const id = (data as { id: string }).id;
  try {
    await replaceStructure(id, parsed.teams, parsed.questions, false);
  } catch (replaceError) {
    await supabase.from("quiz_events").delete().eq("id", id);
    throw replaceError;
  }
  return getAdminQuiz(id);
}

async function replaceStructure(eventId: string, teams: TeamWrite[], questions: QuestionInput[], preserveJoined: boolean) {
  const supabase = createServerClient();
  await supabase.from("quiz_events").update({ current_question_id: null }).eq("id", eventId);
  const { error: deleteQuestionsError } = await supabase.from("quiz_questions").delete().eq("event_id", eventId);
  if (deleteQuestionsError) throw dbError(deleteQuestionsError);
  const { error: questionError } = await supabase.from("quiz_questions").insert(questionRows(eventId, questions));
  if (questionError) throw dbError(questionError);

  if (!preserveJoined) {
    const { error } = await supabase.from("quiz_teams").delete().eq("event_id", eventId);
    if (error) throw dbError(error);
    const { error: insertError } = await supabase.from("quiz_teams").insert(
      teams.map((team, index) => ({
        event_id: eventId,
        name: team.name,
        sort_order: index + 1,
        expected_size: team.expectedSize,
      })),
    );
    if (insertError) throw dbError(insertError);
    return;
  }

  const existing = await loadTeams(eventId);
  const counts = await joinedCounts(eventId);
  const keep = new Set(teams.flatMap((team) => (team.id ? [team.id] : [])));
  for (const team of existing) {
    if (!keep.has(team.id)) {
      if ((counts.get(team.id) ?? 0) > 0) throw new QuizHttpError(409, "참가자가 있는 조는 지울 수 없습니다");
      const { error } = await supabase.from("quiz_teams").delete().eq("id", team.id);
      if (error) throw dbError(error);
    }
  }
  for (const team of teams) {
    if (!team.id || !existing.some((item) => item.id === team.id)) continue;
    const { error } = await supabase.from("quiz_teams").update({ sort_order: existing.find((item) => item.id === team.id)!.sort_order + 12 }).eq("id", team.id);
    if (error) throw dbError(error);
  }
  for (let index = 0; index < teams.length; index += 1) {
    const team = teams[index];
    if (team.id && existing.some((item) => item.id === team.id)) {
      const { error } = await supabase
        .from("quiz_teams")
        .update({ name: team.name, expected_size: team.expectedSize, sort_order: index + 1 })
        .eq("id", team.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await supabase.from("quiz_teams").insert({
        event_id: eventId,
        name: team.name,
        expected_size: team.expectedSize,
        sort_order: index + 1,
      });
      if (error) throw dbError(error);
    }
  }
}

export async function updateQuiz(id: string, body: unknown) {
  const parsed = parseBody(body);
  const event = await loadEvent(id);
  if (event.roster_locked || (event.phase !== "edit" && event.phase !== "lobby")) {
    throw new QuizHttpError(409, "인원을 확정한 뒤에는 문제 구성을 통째로 바꿀 수 없습니다");
  }
  const supabase = createServerClient();
  const { count, error: countError } = await supabase
    .from("quiz_answers")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);
  if (countError) throw dbError(countError);
  if ((count ?? 0) > 0) throw new QuizHttpError(409, "답변이 있는 퀴즈의 문제 구성은 통째로 바꿀 수 없습니다");
  const joined = await joinedCounts(id);
  const anyone = [...joined.values()].some((value) => value > 0);
  const { error } = await supabase
    .from("quiz_events")
    .update({ title: parsed.title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw dbError(error);
  await replaceStructure(id, parsed.teams, parsed.questions, anyone);
  return getAdminQuiz(id);
}

export async function patchQuestion(eventId: string, questionId: string, body: unknown) {
  const event = await loadEvent(eventId);
  const questions = await loadQuestions(eventId);
  const current = questions.find((question) => question.id === questionId);
  if (!current) throw new QuizHttpError(404, "문제를 찾을 수 없습니다");
  const parsed = cleanQuestion(body);
  if (typeof parsed === "string") throw new QuizHttpError(400, parsed);
  const results = await loadResults(eventId);
  const played = results.some((result) => result.question_id === questionId);
  const supabase = createServerClient();
  if (played) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({
        accepted_answers: parsed.kind === "short" ? parsed.acceptedAnswers : [],
        correct_option_id: parsed.kind === "choice" ? parsed.correctOptionId : null,
        ignore_spaces: parsed.ignoreSpaces,
        scope: parsed.scope,
        explanation: parsed.explanation,
        options: parsed.kind === "choice" ? parsed.options : asOptions(current.options),
      })
      .eq("id", questionId);
    if (error) throw dbError(error);
    const updated = (await loadQuestions(eventId)).find((question) => question.id === questionId);
    if (updated) await gradeQuestion(event, updated);
  } else {
    const problem = event.phase === "edit" || event.phase === "lobby" ? null : questionReady(parsed);
    if (problem && event.phase !== "edit" && event.phase !== "lobby") {
      throw new QuizHttpError(400, problem);
    }
    const { error } = await supabase
      .from("quiz_questions")
      .update({
        scope: parsed.scope,
        kind: parsed.kind,
        prompt: parsed.prompt,
        image_data: parsed.imageData,
        has_image: Boolean(parsed.imageData),
        options: parsed.kind === "choice" ? parsed.options : emptyOptions(),
        correct_option_id: parsed.correctOptionId,
        accepted_answers: parsed.acceptedAnswers,
        ignore_spaces: parsed.ignoreSpaces,
        time_limit: parsed.timeLimit,
        points: parsed.points,
        explanation: parsed.explanation,
      })
      .eq("id", questionId);
    if (error) throw dbError(error);
  }
  return getAdminQuiz(eventId);
}

export async function deleteQuiz(id: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("quiz_events").delete().eq("id", id);
  if (error) throw dbError(error);
  return { ok: true };
}

export async function publishQuiz(id: string) {
  const event = await loadEvent(id);
  if (event.status === "live" && event.code && event.public_path) {
    return { ok: true as const, code: event.code, publicPath: event.public_path };
  }
  if (event.phase !== "edit" && event.phase !== "lobby") throw new QuizHttpError(409, "준비 중에만 발행할 수 있습니다");
  const questions = (await loadQuestions(id)).map(toInput);
  const teams = (await loadTeams(id)).map((team) => ({ name: team.name, expectedSize: team.expected_size }));
  const blocker = publishBlocker(questions, teams);
  if (blocker) throw new QuizHttpError(400, blocker);
  const code = event.code ?? (await allocateCode());
  const publicPath = `/q/${code}`;
  const now = new Date().toISOString();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("quiz_events")
    .update({ code, public_path: publicPath, status: "live", phase: "lobby", published_at: now, updated_at: now })
    .eq("id", id);
  if (error) throw dbError(error);
  return { ok: true as const, code, publicPath };
}

export async function removeParticipant(eventId: string, participantId: string) {
  const event = await loadEvent(eventId);
  if (event.roster_locked || event.phase !== "lobby") {
    throw new QuizHttpError(409, "인원을 확정한 뒤에는 참가자를 뺄 수 없습니다");
  }
  const supabase = createServerClient();
  const { error } = await supabase.from("quiz_participants").delete().eq("id", participantId).eq("event_id", eventId);
  if (error) throw dbError(error);
  await broadcastQuiz(event.code);
  return { ok: true };
}

export async function overrideAnswer(eventId: string, body: unknown, actor: string) {
  if (!body || typeof body !== "object") throw new QuizHttpError(400, "요청 형식이 올바르지 않습니다");
  const raw = body as { answerId?: unknown; correct?: unknown };
  if (typeof raw.answerId !== "string" || typeof raw.correct !== "boolean") {
    throw new QuizHttpError(400, "판정 정보가 올바르지 않습니다");
  }
  const event = await ensureClosed(await loadEvent(eventId));
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_answers")
    .select("id, question_id")
    .eq("id", raw.answerId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw dbError(error);
  const answer = data as { id: string; question_id: string } | null;
  if (!answer) throw new QuizHttpError(404, "답변을 찾을 수 없습니다");
  const { error: updateError } = await supabase
    .from("quiz_answers")
    .update({ override_correct: raw.correct, is_correct: raw.correct })
    .eq("id", answer.id);
  if (updateError) throw dbError(updateError);
  const question = (await loadQuestions(eventId)).find((item) => item.id === answer.question_id);
  if (question) await gradeQuestion(event, question);
  await audit(eventId, actor, "override_answer", { answerId: answer.id, correct: raw.correct });
  await broadcastQuiz(event.code);
  return { ok: true };
}

async function transition(
  event: EventRow,
  patch: Record<string, unknown>,
  expectedPhase: Phase | Phase[],
) {
  const phases = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_events")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", event.id)
    .in("phase", phases)
    .select("*");
  if (error) throw dbError(error);
  const row = ((data ?? []) as EventRow[])[0];
  if (!row) throw new QuizHttpError(409, "이미 다른 단계로 넘어갔습니다");
  return row;
}

async function lockRoster(event: EventRow, actor: string) {
  if (event.roster_locked) return event;
  if (event.phase !== "lobby") throw new QuizHttpError(409, "입장 중에만 인원을 확정할 수 있습니다");
  const teams = await loadTeams(event.id);
  const counts = await joinedCounts(event.id);
  const active = teams.filter((team) => (counts.get(team.id) ?? 0) > 0);
  if (active.length < 2) throw new QuizHttpError(400, "2개 이상의 조에 참가자가 있어야 시작할 수 있습니다");
  const supabase = createServerClient();
  for (const team of teams) {
    const { error } = await supabase.from("quiz_teams").update({ locked_size: counts.get(team.id) ?? 0 }).eq("id", team.id);
    if (error) throw dbError(error);
  }
  const locked = await transition(event, { roster_locked: true }, "lobby");
  await audit(event.id, actor, "lock_roster", { teams: active.map((team) => ({ id: team.id, size: counts.get(team.id) ?? 0 })) });
  return locked;
}

export async function controlQuiz(id: string, action: unknown, actor: string) {
  const known = ["lock_roster", "unlock_roster", "start", "end", "reveal", "show_second", "show_first", "end_event", "add_tiebreak", "cancel"];
  if (typeof action !== "string" || !known.includes(action)) throw new QuizHttpError(400, "알 수 없는 진행 명령입니다");
  let event = await ensureClosed(await loadEvent(id));
  const questions = await loadQuestions(id);
  const results = await loadResults(id);
  const played = new Set(results.map((result) => result.question_id));

  if (action === "lock_roster") {
    event = await lockRoster(event, actor);
  } else if (action === "unlock_roster") {
    if (event.phase !== "lobby" || played.size > 0) throw new QuizHttpError(409, "문제가 시작된 뒤에는 인원 확정을 풀 수 없습니다");
    const supabase = createServerClient();
    const { error } = await supabase.from("quiz_teams").update({ locked_size: null }).eq("event_id", id);
    if (error) throw dbError(error);
    event = await transition(event, { roster_locked: false }, "lobby");
    await audit(id, actor, "unlock_roster", {});
  } else if (action === "start") {
    // Starting from the lobby locks the roster from whoever pressed 준비.
    if (event.phase === "lobby" && !event.roster_locked) event = await lockRoster(event, actor);
    if (!event.roster_locked) throw new QuizHttpError(400, "참가 인원이 확정되지 않았습니다");
    if (event.phase === "question") throw new QuizHttpError(409, "이미 문제가 진행 중입니다");
    const next = questions.find((question) => !played.has(question.id));
    if (!next) throw new QuizHttpError(400, "남은 문제가 없습니다");
    const problem = questionReady(toInput(next));
    if (problem) throw new QuizHttpError(400, `${next.sort_order}번 ${problem}`);
    const started = new Date();
    const ends = new Date(started.getTime() + next.time_limit * 1000);
    event = await transition(
      event,
      {
        phase: "question",
        current_question_id: next.id,
        question_started_at: started.toISOString(),
        question_ends_at: ends.toISOString(),
        final_step: 0,
      },
      ["lobby", "reveal"],
    );
    await audit(id, actor, "start_question", { questionId: next.id, endsAt: ends.toISOString() });
  } else if (action === "end") {
    if (event.phase !== "question") throw new QuizHttpError(409, "진행 중인 문제가 없습니다");
    const now = new Date().toISOString();
    const supabase = createServerClient();
    const { error } = await supabase
      .from("quiz_events")
      .update({ question_ends_at: now, updated_at: now })
      .eq("id", id)
      .eq("phase", "question");
    if (error) throw dbError(error);
    event = await ensureClosed(await loadEvent(id));
    await audit(id, actor, "end_question", { questionId: event.current_question_id });
  } else if (action === "reveal") {
    if (event.phase !== "closed") throw new QuizHttpError(409, "마감된 문제만 공개할 수 있습니다");
    event = await transition(event, { phase: "reveal" }, "closed");
    await audit(id, actor, "reveal", { questionId: event.current_question_id });
  } else if (action === "show_second" || action === "show_first") {
    const teams = await loadTeams(id);
    const standings = buildStandings(teams, results, event.current_question_id, true);
    const tie = awardTie(standings);
    if ((tie.first || tie.second) && questions.length < MAX_QUESTIONS) {
      throw new QuizHttpError(409, "1등 또는 2등 동점입니다. 추가 문제로 순위를 가른 뒤 발표하세요.");
    }
    if (action === "show_second") {
      event = await transition(event, { phase: "final", final_step: 1 }, ["reveal", "final"]);
    } else {
      if (event.phase === "reveal") event = await transition(event, { phase: "final", final_step: 1 }, "reveal");
      event = await transition({ ...event, phase: "final" }, { final_step: 2 }, "final");
    }
    await audit(id, actor, action, {});
  } else if (action === "end_event") {
    event = await transition(
      event,
      { phase: "ended", status: "ended", ended_at: new Date().toISOString() },
      ["reveal", "final", "ended"],
    );
    await audit(id, actor, "end_event", {});
  } else if (action === "cancel") {
    event = await transition(
      event,
      { phase: "ended", status: "cancelled", ended_at: new Date().toISOString() },
      ["edit", "lobby", "question", "closed", "reveal", "final"],
    );
    await audit(id, actor, "cancel", {});
  } else if (action === "add_tiebreak") {
    if (event.phase === "question") throw new QuizHttpError(409, "문제 진행 중에는 문제를 추가할 수 없습니다");
    if (questions.length >= MAX_QUESTIONS) throw new QuizHttpError(400, "문제는 10개까지입니다");
    const supabase = createServerClient();
    const { error } = await supabase.from("quiz_questions").insert({
      event_id: id,
      sort_order: questions.length + 1,
      scope: "team",
      kind: "choice",
      prompt: "",
      options: emptyOptions(),
      points: 100,
      time_limit: 30,
    });
    if (error) throw dbError(error);
    await audit(id, actor, "add_tiebreak", { sortOrder: questions.length + 1 });
  }

  await broadcastQuiz(event.code);
  return { ok: true as const, phase: event.phase, finalStep: event.final_step };
}

export async function getHostLive(id: string): Promise<ConsoleState> {
  const event = await ensureClosed(await loadEvent(id));
  const [questions, teams, results, counts] = await Promise.all([
    loadQuestions(id),
    loadTeams(id),
    loadResults(id),
    joinedCounts(id),
  ]);
  const played = new Set(results.map((result) => result.question_id));
  const current = questions.find((question) => question.id === event.current_question_id) ?? null;
  const revealed = event.phase === "closed" || event.phase === "reveal" || event.phase === "final" || event.phase === "ended";
  const includeCurrent = current != null && played.has(current.id);
  const standings = event.roster_locked ? buildStandings(teams, results, current?.id ?? null, includeCurrent) : [];
  const supabase = createServerClient();
  let submitted = new Map<string, number>();
  let review: ReviewAnswer[] | null = null;
  if (current && event.phase !== "lobby" && event.phase !== "edit") {
    const { data, error } = await supabase
      .from("quiz_answers")
      .select("id, team_id, option_id, answer_text, is_correct, override_correct")
      .eq("question_id", current.id);
    if (error) throw dbError(error);
    const answers = (data ?? []) as Pick<AnswerRow, "id" | "team_id" | "option_id" | "answer_text" | "is_correct" | "override_correct">[];
    submitted = new Map();
    for (const answer of answers) submitted.set(answer.team_id, (submitted.get(answer.team_id) ?? 0) + 1);
    if (revealed) {
      const names = new Map(teams.map((team) => [team.id, team.name]));
      review = answers.map((answer) => ({
        id: answer.id,
        teamName: names.get(answer.team_id) ?? "",
        optionId: answer.option_id,
        answerText: answer.answer_text,
        isCorrect: answer.is_correct,
        overridden: answer.override_correct != null,
      }));
    }
  }
  const next = questions.find((question) => !played.has(question.id) && question.id !== current?.id);
  return {
    serverNow: new Date().toISOString(),
    phase: event.phase,
    status: event.status,
    rosterLocked: event.roster_locked,
    finalStep: event.final_step,
    title: event.title,
    code: event.code,
    publicPath: event.public_path,
    participantCount: [...counts.values()].reduce((sum, value) => sum + value, 0),
    teamCount: teams.length,
    questionCount: questions.length,
    playedCount: played.size,
    endsAt: event.phase === "question" ? event.question_ends_at : null,
    currentQuestion: current
      ? { ...toPublicQuestion(current, revealed), acceptedAnswers: revealed ? (current.accepted_answers ?? []) : [] }
      : null,
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      expectedSize: team.expected_size,
      lockedSize: team.locked_size,
      joined: counts.get(team.id) ?? 0,
      submitted: submitted.get(team.id) ?? 0,
    })),
    submittedCount: [...submitted.values()].reduce((sum, value) => sum + value, 0),
    questionResults: current && includeCurrent ? questionScores(teams, results, current.id) : null,
    standings,
    awardTie: awardTie(standings),
    nextIndex: event.phase === "question" ? current?.sort_order ?? null : next?.sort_order ?? null,
    review,
  };
}

export async function exportResults(id: string) {
  const event = await loadEvent(id);
  const [questions, teams, results] = await Promise.all([loadQuestions(id), loadTeams(id), loadResults(id)]);
  const standings = buildStandings(teams, results, null, true);
  const header = ["순위", "조", "확정인원", ...questions.map((question) => `${question.sort_order}번${question.scope === "individual" ? "(개인)" : ""}`), "누적점수"];
  const lines = [header.join(",")];
  for (const standing of standings) {
    const cells = [
      String(standing.rank),
      standing.teamName,
      String(standing.rosterSize),
      ...questions.map((question) => {
        if (question.scope === "individual") return "";
        const result = results.find((item) => item.question_id === question.id && item.team_id === standing.teamId);
        return result ? (scaled(result.points_scaled) / 1_000_000_000).toFixed(4) : "";
      }),
      (standing.totalScaled / 1_000_000_000).toFixed(4),
    ];
    lines.push(cells.map((cell) => `"${cell.split('"').join('""')}"`).join(","));
  }
  return { filename: `${event.title}.csv`, body: `\uFEFF${lines.join("\n")}` };
}

async function findParticipant(eventId: string, token: string) {
  if (!token) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_participants")
    .select("id, team_id")
    .eq("event_id", eventId)
    .eq("join_token", token)
    .maybeSingle();
  if (error) throw dbError(error);
  return (data as { id: string; team_id: string } | null) ?? null;
}

export async function getPublicState(code: string, token: string, asScreen = false): Promise<PublicState> {
  let event = await loadByCode(code);
  event = await ensureClosed(event);
  if (event.status === "cancelled") {
    return emptyPublic(event, true);
  }
  const [questions, teams, results] = await Promise.all([
    loadQuestions(event.id),
    loadTeams(event.id),
    loadResults(event.id),
  ]);
  const participant = token ? await findParticipant(event.id, token) : null;
  const teamName = teams.find((team) => team.id === participant?.team_id)?.name ?? "";
  const current = questions.find((question) => question.id === event.current_question_id) ?? null;
  const revealed = event.phase === "reveal" || event.phase === "final" || event.phase === "ended";
  const showQuestion = current && event.phase !== "lobby" && event.phase !== "edit" && (participant || asScreen);
  let submitted: PublicState["submitted"] = null;
  let myCorrect: boolean | null = null;
  if (participant && current && showQuestion) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("quiz_answers")
      .select("option_id, answer_text, is_correct")
      .eq("question_id", current.id)
      .eq("participant_id", participant.id)
      .maybeSingle();
    if (error) throw dbError(error);
    const answer = data as { option_id: string | null; answer_text: string; is_correct: boolean } | null;
    if (answer) {
      submitted = { optionId: answer.option_id, text: answer.answer_text };
      myCorrect = revealed ? answer.is_correct : null;
    }
  }
  const playedCurrent = current != null && results.some((result) => result.question_id === current.id);
  const standings = event.roster_locked ? buildStandings(teams, results, current?.id ?? null, playedCurrent) : [];
  const tie = awardTie(standings);
  const leaders = standings.filter((row) => row.rank === 1);
  const awaitingFinal = event.phase === "reveal" && questions.every((question) => results.some((result) => result.question_id === question.id));
  const publicStandings = event.phase === "ended" ? standings : event.phase === "reveal" ? leaders : null;
  return {
    title: event.title,
    phase: event.phase,
    status: event.status,
    rosterLocked: event.roster_locked,
    finalStep: event.final_step,
    serverNow: new Date().toISOString(),
    endsAt: event.phase === "question" ? event.question_ends_at : null,
    joined: Boolean(participant),
    invalidToken: Boolean(token) && !participant,
    participant: participant ? { id: participant.id, teamId: participant.team_id, teamName } : null,
    teams: event.phase === "lobby" && !event.roster_locked ? teams.map((team) => ({ id: team.id, name: team.name })) : [],
    question: showQuestion && current && event.phase !== "ended" ? toPublicQuestion(current, event.phase === "reveal") : null,
    submitted,
    myCorrect: event.phase === "reveal" ? myCorrect : null,
    questionResults: null,
    standings: publicStandings,
    ceremony: null,
    awardTie: tie,
    awaitingFinal,
  };
}

function emptyPublic(event: EventRow, cancelled: boolean): PublicState {
  return {
    title: event.title,
    phase: cancelled ? "ended" : event.phase,
    status: event.status,
    rosterLocked: event.roster_locked,
    finalStep: 0,
    serverNow: new Date().toISOString(),
    endsAt: null,
    joined: false,
    invalidToken: false,
    participant: null,
    teams: [],
    question: null,
    submitted: null,
    myCorrect: null,
    questionResults: null,
    standings: null,
    ceremony: null,
    awardTie: { first: false, second: false },
    awaitingFinal: false,
  };
}

export async function joinQuiz(code: string, body: unknown) {
  if (!body || typeof body !== "object") throw new QuizHttpError(400, "요청 형식이 올바르지 않습니다");
  const teamId = (body as { teamId?: unknown }).teamId;
  if (typeof teamId !== "string") throw new QuizHttpError(400, "조를 선택하세요");
  const event = await loadByCode(code);
  if (event.status !== "live" || event.phase !== "lobby" || event.roster_locked) {
    throw new QuizHttpError(403, "지금은 입장할 수 없습니다");
  }
  const team = (await loadTeams(event.id)).find((item) => item.id === teamId);
  if (!team) throw new QuizHttpError(404, "조를 찾을 수 없습니다");
  const token = randomBytes(24).toString("hex");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quiz_participants")
    .insert({ event_id: event.id, team_id: team.id, join_token: token, created_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw dbError(error);
  await broadcastQuiz(event.code);
  return { token, participantId: (data as { id: string }).id, teamId: team.id, teamName: team.name };
}

export async function submitAnswer(code: string, token: string, body: unknown) {
  if (!token) throw new QuizHttpError(401, "먼저 입장해 주세요");
  if (!body || typeof body !== "object") throw new QuizHttpError(400, "요청 형식이 올바르지 않습니다");
  const raw = body as { questionId?: unknown; optionId?: unknown; text?: unknown };
  if (typeof raw.questionId !== "string") throw new QuizHttpError(400, "문제가 올바르지 않습니다");
  const event = await loadByCode(code);
  if (event.phase !== "question" || event.current_question_id !== raw.questionId) {
    throw new QuizHttpError(409, "지금 받을 수 있는 문제가 아닙니다");
  }
  const ends = event.question_ends_at ? new Date(event.question_ends_at).getTime() : 0;
  const now = new Date();
  if (!ends || now.getTime() > ends) throw new QuizHttpError(400, "시간이 종료되었습니다");
  const participant = await findParticipant(event.id, token);
  if (!participant) throw new QuizHttpError(401, "입장 정보가 없습니다. 다시 입장해 주세요");
  const question = (await loadQuestions(event.id)).find((item) => item.id === raw.questionId);
  if (!question) throw new QuizHttpError(404, "문제를 찾을 수 없습니다");
  const optionId = question.kind === "choice" && typeof raw.optionId === "string" ? raw.optionId : null;
  const text = question.kind === "short" && typeof raw.text === "string" ? raw.text.trim() : "";
  if (question.kind === "choice" && !asOptions(question.options).some((option) => option.id === optionId)) {
    throw new QuizHttpError(400, "보기를 선택하세요");
  }
  if (question.kind === "short" && !text) throw new QuizHttpError(400, "답을 입력하세요");
  if (text.length > 80) throw new QuizHttpError(400, "답은 80자 이하로 입력하세요");
  const input = toInput(question);
  const supabase = createServerClient();
  const { error } = await supabase.from("quiz_answers").insert({
    event_id: event.id,
    question_id: question.id,
    participant_id: participant.id,
    team_id: participant.team_id,
    option_id: optionId,
    answer_text: text,
    is_correct: judgeAnswer(input, { optionId, text }),
    submitted_at: now.toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { ok: true as const, already: true };
    throw dbError(error);
  }
  const after = await loadEvent(event.id);
  const endedAt = after.question_ends_at ? new Date(after.question_ends_at).getTime() : ends;
  if (now.getTime() > endedAt) {
    await supabase
      .from("quiz_answers")
      .delete()
      .eq("question_id", question.id)
      .eq("participant_id", participant.id);
    if (after.phase !== "question") await gradeQuestion(after, question);
    throw new QuizHttpError(400, "시간이 종료되었습니다");
  }
  if (after.phase !== "question") await gradeQuestion(after, question);
  await broadcastQuiz(event.code);
  return { ok: true as const, already: false };
}

export async function getQuestionImage(code: string, token: string, questionId: string, asScreen = false, optionId = "") {
  const event = await loadByCode(code);
  if (!asScreen) {
    if (!token) throw new QuizHttpError(401, "먼저 입장해 주세요");
    const participant = await findParticipant(event.id, token);
    if (!participant) throw new QuizHttpError(401, "입장 정보가 없습니다");
  }
  if (event.current_question_id !== questionId || event.phase === "lobby" || event.phase === "edit") {
    throw new QuizHttpError(404, "지금은 이 문제를 볼 수 없습니다");
  }
  const supabase = createServerClient();
  const { data, error } = await supabase.from("quiz_questions").select("image_data, options").eq("id", questionId).maybeSingle();
  if (error) throw dbError(error);
  const row = data as { image_data: string | null; options: QuestionRow["options"] } | null;
  if (!row) throw new QuizHttpError(404, "사진이 없습니다");
  if (optionId) {
    const image = asOptions(row.options).find((option) => option.id === optionId)?.imageData;
    if (!image) throw new QuizHttpError(404, "사진이 없습니다");
    return { imageData: image };
  }
  if (!row.image_data) throw new QuizHttpError(404, "사진이 없습니다");
  if (isQuizVideoRef(row.image_data)) {
    try {
      const videoUrl = await signQuizVideo(row.image_data);
      if (!videoUrl) throw new QuizHttpError(404, "영상이 없습니다");
      return { videoUrl };
    } catch (error) {
      if (error instanceof QuizHttpError) throw error;
      throw new QuizHttpError(500, error instanceof Error ? error.message : "영상을 열지 못했습니다");
    }
  }
  return { imageData: row.image_data };
}

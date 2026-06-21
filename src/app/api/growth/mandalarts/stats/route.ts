import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

// ── 불용어 ─────────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  // ① 동사 어간
  "하다","되다","있다","없다","이다","하기","되기","하여","해서","하며","하면","하는",
  "된다","한다","하고","하지","하게","했다","한다","해야","하자","해도","해야","해요",
  "이루다","이루기","이루","이뤄","이루어","이루며","이루어서",
  "만들다","만들기","만들","만들어","만들며",
  "높이다","높이기","높이","키우다","키우기","키우","늘리다","줄이다",
  "이해하다","파악하다","실현하다","실현","구현하다","구현",
  "완성하다","실천하다","실천하기","실천","유지하다","유지하기","유지",
  "노력하다","노력하기","노력","노력해","노력함",
  "향상하다","향상하기","향상","개선하다","개선하기","개선",
  "발전하다","발전하기","발전","성장하다","성장하기",
  "준비하다","준비하기","준비","완료하다","완료하기","완료",
  "시작하다","시작하기","시작","계속하다","계속하기","계속",
  "익히다","익히기","습득하다","습득하기","습득",
  "갖추다","갖추기","갖추","기르다","기르기",
  "다지다","다지기","다지","쌓다","쌓기","쌓",
  "활용하다","활용하기","활용","오르다","올리다","높아지다","낮추다",
  "이끌다","이끌","이끌어","이끄는","이끄",
  "맞추다","맞추","바꾸다","바꾸","채우다","채우",
  "늘다","줄다","지키다","지키","세우다","세우",
  "나누다","나누","알리다","알리","이어가다","이어가",
  "보내다","보내","이끌어","이끌어가","해나가","해나가다",
  "즐기다","즐기기","즐기","즐겨","도전하다","도전하기",
  "배우다","배우기","배워","배움","가르치다","가르치",
  "드리다","드리기","드려","드림",
  "받다","받기","받아","줘","줌",
  "이어","이어서","이어나가","이어나가다",
  // ② 관형사형 동사 어미 (갖춘/이룬/만든 등의 원형)
  "된","한","된다","하는","되는","있는","없는","할","될","갖",
  "할수","될수","할것","될것","할수있","될수있",
  // ③ 부사 / 접속부사
  "함께","같이","더불어","서로","함께하","함께하는","함께하며",
  "위해","위한","통해","통한","대한","관한","향한","관련","으로","에서","에게",
  "부터","까지","처럼","같은","이런","저런","어떤","모든",
  "더욱","더","잘","매우","정말","항상","언제나","꼭","반드시","늘",
  "크게","작게","빠르게","빠른","빠르","느리게","느린",
  "좋게","나쁘게","높게","낮게","많이","적게","조금","충분히",
  "꾸준히","꾸준한","꾸준","꾸준하","체계적","효과적","전략적",
  "지속적","지속","효율적","전문적","적극적","능동적","주도적",
  "주기적","정기적","일관된","올바른","긍정적","구체적","단계별","단계적",
  "자발적","자율적","협력적","창의적","혁신적",
  // ④ 수식어 (최고/최선류)
  "최고","최선","최대","최소","최적","최우수","최고의","최선의",
  "뛰어난","뛰어나","탁월한","탁월","훌륭한","훌륭",
  "완벽한","완벽","특별한","특별","중요한","중요",
  "올바른","바람직","이상적","완벽히",
  "좋은","나쁜","높은","낮은","새로운","다양한","큰","작은","많은","적은",
  // ⑤ 접속사 / 조사 단독
  "그리고","또한","그래서","하지만","그러나","때문","또는","혹은","및","등","통하여",
  "그런데","그러므로","따라서","왜냐하면","결국","비록","만약","만일",
  // ⑥ 대명사 / 지시어
  "이것","저것","그것","이를","그를","나를","우리","저를","그게","이게",
  "것을","것이","것은","것도","것만","무언가",
  "나의","나는","내가","내","저의","저는","제가","우리의",
  // ⑦ 시간·수량 부사
  "하나","둘","셋","넷","다섯","여섯","일곱","여덟","아홉","열",
  "매일","매주","매달","매월","하루","주간","월간","연간","분기","분기별",
  "오전","오후","아침","저녁","밤","주말","평일","일과","일상",
  "매번","항상","늘","언제나","꼭","반드시",
  // ⑧ 일반 목표/업무 단어
  "업무","관리","실천","능력","역량","이상","이하","이내","이상적",
  "기본","기초","기본기","전반","전체","전문","전문성","향상","달성","완수","수행","추진","진행",
  "목표","기록","작성","시간","일주일","한달","한해","연도","기간","일정","계획","플랜",
  "오늘","내일","이번","다음","올해","내년","작년","현재","앞으로","앞날",
  "생각","마음","마음가짐","태도","자세","의지","각오","다짐","다시","새로이",
  "사내","사외","조직","팀내","팀","팀워크","직무","직장","회사","본인","자신",
  "본부","센터","부서","소속","담당","담당자","관계자","관계","협업",
  "방법","방식","방안","수단","도구","툴","시스템","프로세스","프로",
  "사람","직원","구성원","팀원","동료","선배","후배","상사","부하","인원",
  "일","것","점","면","측면","부분","요소","사항","문제","과제","이슈",
  "통한","통해서","통하여","기반","기반으로","기반한",
  // ⑨ 학습 일반어
  "학습","공부","복습","예습","스터디","인풋","아웃풋","피드백","리뷰","회고",
  "읽기","읽음","독서","책읽기","강의","교육","트레이닝","세미나","교육과정",
  "이수","수강","수료","합격","취득","자격","자격증","시험","점수","성적",
  // ⑩ 숫자 조합
  "1개","2개","3개","4개","5개","6개","7개","8개","9개","10개",
  "1회","2회","3회","4회","5회","1번","2번","3번","4번","5번",
  "1시간","2시간","3시간","30분","1일","2일","3일","1주","2주",
  "10분","15분","20분","30분","60분","100%","50%",
  // ⑪ 기타
  "포함","제외","추가","삭제","수정","변경","확인","점검","체크","check",
  "etc","기타","참고","내용","결과","성과","효과","효율","품질","퀄리티",
  // ⑫ 자주 나오는 형용사/관형사 어간
  "좋아","좋아져","좋아지","잘되","잘해","잘못","못해","못함",
  "건강한","건강하게","건강히",
  "행복한","행복하게","행복히",
]);

// 숫자+단위 패턴
const NUMBER_UNIT_PATTERN = /^\d+[회번개시간분일주월년%]$/;

// ── 조사 제거 (긴 것부터 순서 중요) ────────────────────────────────────────────
const PARTICLE_SUFFIXES = [
  "에서의", "으로서", "이라는", "이라고", "에서도", "에서는",
  "한테서", "에게서",
  "에서", "에게", "한테", "으로", "부터", "까지", "처럼", "보다",
  "이나", "이라", "이고", "이며", "이든",
  "와서", "아서",
  "와", "과", "의", "를", "을", "은", "는", "이", "가", "도", "만", "나",
];

// 형용사·관형사·동사 어미 (긴 것부터)
const ADJ_ENDINGS = [
  "스러운", "스럽게", "스러워", "스러운", "스런", "다운", "적인", "스럽",
  // 동사 관형사형 어미
  "해나가는", "이어가는", "해나가", "이어가",
  "하고있는", "하고있", "하고 있는",
  "하려는", "되려는", "하려고", "되려고",
  "하면서", "되면서", "이루면서",
  "함으로써", "함으로",
  "하여서", "되어서",
  "하므로", "되므로",
  "하여금", "로써",
  // 관형사형: 동사어간+는/은/ㄴ/을/ㄹ
  "하는", "되는", "있는", "없는",
  "했던", "됐던", "했을",
];

// ── 토큰 정규화: 조사·어미 제거 + 관형사형 복원 ───────────────────────────────
function normalizeToken(word: string): string {
  let w = word;

  // 1. 동사·형용사 어미 제거 (긴 것부터)
  for (const e of ADJ_ENDINGS) {
    if (w.endsWith(e) && w.length > e.length + 1) {
      w = w.slice(0, -e.length);
      break;
    }
  }

  // 2. 조사 제거
  for (const p of PARTICLE_SUFFIXES) {
    if (w.endsWith(p) && w.length > p.length + 1) {
      w = w.slice(0, -p.length);
      break;
    }
  }

  // 3. Unicode 관형사형 ㄴ받침 복원: 갖춘→갖추, 배운→배우, 이룬→이루
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  const lastCode = w.charCodeAt(w.length - 1);
  if (lastCode >= HANGUL_START && lastCode <= HANGUL_END) {
    const idx = lastCode - HANGUL_START;
    if (idx % 28 === 4) {
      // 종성 ㄴ만 복원 (ㄹ은 명사 어근에도 흔해서 복원 안 함: 발/달/말/물 등)
      w = w.slice(0, -1) + String.fromCharCode(HANGUL_START + idx - 4);
    }
  }

  // 4. 어간이 "하"로 끝나면 명사 추출: 건강하→건강, 전문하→전문
  if (w.endsWith("하") && w.length > 2) {
    w = w.slice(0, -1);
  }

  // 5. 어간이 "되"로 끝나면 제거: 이루어지되→이루어지 등
  if (w.endsWith("되") && w.length > 2) {
    w = w.slice(0, -1);
  }

  return w;
}

// ── 유효한 키워드 검증 ──────────────────────────────────────────────────────────
function isValidKeyword(word: string): boolean {
  if (!word || word.length < 2 || word.length > 10) return false;
  if (STOPWORDS.has(word)) return false;
  if (/^\d+$/.test(word)) return false;
  if (NUMBER_UNIT_PATTERN.test(word)) return false;
  if (/^[A-Za-z]{1,2}$/.test(word)) return false;

  // 동사 어간 검출: word+"다" 또는 word+"하다" 또는 word+"기" 또는 word+"하기"가 불용어인지 확인
  if (STOPWORDS.has(word + "다")) return false;
  if (STOPWORDS.has(word + "하다")) return false;
  if (STOPWORDS.has(word + "기")) return false;
  if (STOPWORDS.has(word + "하기")) return false;
  if (STOPWORDS.has(word + "이다")) return false;

  // 동사/형용사 어미로 끝나는 형태 거부 (정규화 후에도 남아있는 경우)
  if (/(?:하다|되다|이다|있다|없다|한다|된다|함께|같이|더불어|하여|되어|으로서|이라고|이라는)$/.test(word)) return false;

  return true;
}

// 정규화 결과가 stopword/동사어간이면 원본 폴백 금지 판단
function isNormalizedRejected(normalized: string): boolean {
  if (!normalized || normalized.length < 2) return true;
  if (STOPWORDS.has(normalized)) return true;
  if (STOPWORDS.has(normalized + "다")) return true;
  if (STOPWORDS.has(normalized + "하다")) return true;
  if (STOPWORDS.has(normalized + "기")) return true;
  return false;
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const raw = text.split(/[\s,./!?;:'"()\[\]{}<>·\-–—~↑↓→←★☆◆◇●○□■▶▷]+/);
  for (const t of raw) {
    const trimmed = t.trim();
    if (trimmed.length < 2) continue;

    // 정규화된 형태로 검사 (조사/어미 제거 후)
    const normalized = normalizeToken(trimmed);

    if (normalized.length >= 2 && isValidKeyword(normalized)) {
      tokens.push(normalized);
    } else if (
      normalized !== trimmed &&
      !isNormalizedRejected(normalized) &&
      trimmed.length >= 2 &&
      isValidKeyword(trimmed)
    ) {
      // 정규화 결과가 너무 짧아진 경우에만 원본 사용 (stopword/동사어간 히트 시 원본도 차단)
      tokens.push(trimmed);
    }
  }
  return tokens;
}

// GET /api/growth/mandalarts/stats
export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohort_id");

  const supabase = createServerClient();

  let mQuery = supabase
    .from("growth_mandalarts")
    .select("id, user_id")
    .eq("visibility", "cohort");
  if (cohortId) mQuery = mQuery.eq("cohort_id", cohortId);
  const { data: mandalarts } = await mQuery;

  const mandalartList = mandalarts ?? [];
  const totalMandalarts = mandalartList.length;

  if (totalMandalarts === 0) {
    return NextResponse.json({
      words: [],
      totals: { mandalarts: 0, cells_filled: 0, cells_done: 0, todos: 0, todos_done: 0 },
    });
  }

  const mandalartUserMap = new Map<string, string>(
    mandalartList.map((m: { id: string; user_id: string }) => [m.id, m.user_id]),
  );
  const mandalartIds = mandalartList.map((m: { id: string }) => m.id);

  const { data: cells } = await supabase
    .from("growth_mandalart_cells")
    .select("id, mandalart_id, block_idx, cell_idx, text, done")
    .in("mandalart_id", mandalartIds);

  const cellList = cells ?? [];
  const cellIds = cellList.map((c: { id: string }) => c.id);
  const cellsFilled = cellList.filter((c: { text: string }) => c.text?.trim()).length;
  const cellsDone = cellList.filter((c: { done: boolean }) => c.done).length;

  let todoList: Array<{ text: string; done: boolean }> = [];
  if (cellIds.length > 0) {
    try {
      const { data: todos, error: todosErr } = await supabase
        .from("growth_mandalart_cell_todos")
        .select("text, done")
        .in("cell_id", cellIds);
      if (!todosErr && todos) todoList = todos;
    } catch { /* table not yet created */ }
  }
  const totalTodos = todoList.length;
  const todosDone = todoList.filter((t) => t.done).length;

  // ── 키워드 집계: 핵심목표(block4/cell4) + 서브목표(block4 나머지) ──────────
  const goalCells = cellList.filter(
    (c: { block_idx: number; text: string }) =>
      c.block_idx === 4 && c.text?.trim().length > 0,
  );

  // 사람별 등장 단어 set
  const wordPersonSet: Record<string, Set<string>> = {};

  for (const cell of goalCells) {
    const userId =
      mandalartUserMap.get((cell as { mandalart_id: string }).mandalart_id) ?? "unknown";
    const tokens = tokenize((cell as { text: string }).text);
    for (const token of tokens) {
      if (!wordPersonSet[token]) wordPersonSet[token] = new Set();
      wordPersonSet[token].add(userId);
    }
  }

  // 최소 인원 이상이 공통으로 쓴 단어만 포함
  const minPersons = Math.max(1, Math.floor(totalMandalarts * 0.15));
  const freq: Record<string, number> = {};
  for (const [word, persons] of Object.entries(wordPersonSet)) {
    if (persons.size >= minPersons) {
      freq[word] = persons.size;
    }
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const maxCount = sorted[0]?.[1] ?? 1;
  const words = sorted.map(([text, count]) => ({
    text,
    weight: Math.round((count / maxCount) * 100) / 100,
    count,
  }));

  return NextResponse.json({
    words,
    totals: {
      mandalarts: totalMandalarts,
      cells_filled: cellsFilled,
      cells_done: cellsDone,
      todos: totalTodos,
      todos_done: todosDone,
    },
  });
}

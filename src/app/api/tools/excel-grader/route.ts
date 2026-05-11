import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeItem {
  id: string;
  label: string;
  hint: string;
  expected: number | string;
  actual: number | string | null;
  pass: boolean | null; // null = 미작성
}

export interface StepResult {
  step: number;
  title: string;
  items: GradeItem[];
  score: number;
  total: number;
}

export interface GradeResult {
  steps: StepResult[];
  totalScore: number;
  totalItems: number;
  gradeAt: string;
  sheetsMissing: string[];
}

// ─── 정답 키 (v3_fixed 기준) ─────────────────────────────────────────────────

const ANS = {
  // STEP1: 결과작성_STEP1_보고용집계
  step1: {
    // C5:C9 — 지점별 정상 거래금액 합계
    branchAmt: [
      { label: "B001", expected: 6_356_500_000 },
      { label: "B002", expected: 8_651_000_000 },
      { label: "B003", expected: 8_919_500_000 },
      { label: "B004", expected: 8_549_200_000 },
      { label: "B005", expected: 7_611_500_000 },
    ],
    // D5:D9 — 지점별 수수료 합계
    branchFee: [
      { label: "B001", expected: 10_814_460 },
      { label: "B002", expected: 23_780_120 },
      { label: "B003", expected: 22_154_970 },
      { label: "B004", expected: 14_708_740 },
      { label: "B005", expected: 15_720_100 },
    ],
    // J5:J9 — 상품유형별 정상 거래금액 합계
    prodAmt: [
      { label: "주식", expected: 13_793_900_000 },
      { label: "펀드", expected: 9_737_600_000 },
      { label: "채권", expected: 8_232_200_000 },
      { label: "ELS",  expected: 4_410_700_000 },
      { label: "RP",   expected: 3_601_400_000 },
    ],
    // B12:B31 — 직원명 VLOOKUP (E001~E020 순서)
    empNames: [
      "김민준","이서연","박도윤","최하은","정지호",
      "강서준","조지민","윤현우","장수아","임유진",
      "한시우","오예준","서지우","신하린","권민재",
      "황나은","안준호","송다은","류태윤","홍채원",
    ],
  },

  // STEP2: 결과작성_STEP2_오류찾기 + 거래원장_RAW K열
  step2: {
    // C5:C9 — 오류유형별 발견 건수
    errCounts: [
      { label: "거래금액 오류",   expected: 1, row: 5 },
      { label: "수수료율 오류",   expected: 1, row: 6 },
      { label: "수수료금액 오류", expected: 0, row: 7 },
      { label: "상품유형 오류",   expected: 1, row: 8 },
      { label: "거래유형 오류",   expected: 0, row: 9 },
    ],
    // K열에 오류유형이 표시되어야 하는 3개 행 (날짜·지점·직원·고객 키)
    errRows: [
      { key: [20250104, "B004", "E004", "C066"], label: "K열 · 거래금액=0 행", hint: "J=정상 AND G≤0 → '거래금액 오류'" },
      { key: [20250109, "B002", "E002", "C021"], label: "K열 · 수수료율=1.5% 행", hint: "J=정상 AND H>0.005 → '수수료율 오류'" },
      { key: [20250122, "B002", "E017", "C065"], label: "K열 · 상품유형=ETF 행", hint: "J=정상 AND E not in {주식/펀드/채권/ELS/RP} → '상품유형 오류'" },
    ],
  },
} as const;

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function cv(ws: XLSX.WorkSheet, ref: string): number | string | null {
  const c = ws[ref];
  if (!c) return null;
  return c.v ?? null;
}

function numMatch(actual: number | string | null, expected: number): boolean | null {
  if (actual === null || actual === "") return null;
  const n = typeof actual === "string" ? parseFloat(actual) : actual;
  if (isNaN(n)) return null;
  return n === expected;
}

function strMatch(actual: number | string | null, expected: string): boolean | null {
  if (actual === null) return null;
  const s = String(actual).trim();
  if (s === "") return null;
  return s === expected.trim();
}

function fmt(v: number): string {
  return new Intl.NumberFormat("ko-KR").format(v);
}

// ─── STEP1 채점 ───────────────────────────────────────────────────────────────

function gradeStep1(ws: XLSX.WorkSheet): GradeItem[] {
  const items: GradeItem[] = [];

  // 지점별 정상 거래금액 (C5:C9)
  ANS.step1.branchAmt.forEach(({ label, expected }, i) => {
    const actual = cv(ws, `C${5 + i}`);
    items.push({
      id: `s1_bamt_${i}`,
      label: `지점별 거래금액 · ${label}`,
      hint: `=SUMIFS(거래원장_RAW!G:G, 거래원장_RAW!B:B, "${label}", 거래원장_RAW!J:J, "정상")`,
      expected,
      actual: actual as number | null,
      pass: numMatch(actual, expected),
    });
  });

  // 지점별 수수료합계 (D5:D9)
  ANS.step1.branchFee.forEach(({ label, expected }, i) => {
    const actual = cv(ws, `D${5 + i}`);
    items.push({
      id: `s1_bfee_${i}`,
      label: `지점별 수수료합계 · ${label}`,
      hint: `=SUMIFS(거래원장_RAW!I:I, 거래원장_RAW!B:B, "${label}", 거래원장_RAW!J:J, "정상")`,
      expected,
      actual: actual as number | null,
      pass: numMatch(actual, expected),
    });
  });

  // 상품유형별 거래금액 (J5:J9)
  ANS.step1.prodAmt.forEach(({ label, expected }, i) => {
    const actual = cv(ws, `J${5 + i}`);
    items.push({
      id: `s1_pamt_${i}`,
      label: `상품유형별 거래금액 · ${label}`,
      hint: `=SUMIFS(거래원장_RAW!G:G, 거래원장_RAW!E:E, "${label}", 거래원장_RAW!J:J, "정상")`,
      expected,
      actual: actual as number | null,
      pass: numMatch(actual, expected),
    });
  });

  // 직원명 VLOOKUP (B12:B31)
  ANS.step1.empNames.forEach((name, i) => {
    const empId = `E${String(i + 1).padStart(3, "0")}`;
    const actual = cv(ws, `B${12 + i}`);
    items.push({
      id: `s1_emp_${i}`,
      label: `직원명 조회 · ${empId}`,
      hint: `=VLOOKUP(A${12 + i}, 직원마스터!A:B, 2, 0)  또는  =XLOOKUP(A${12 + i}, 직원마스터!A:A, 직원마스터!B:B)`,
      expected: name,
      actual: actual as string | null,
      pass: strMatch(actual, name),
    });
  });

  return items;
}

// ─── STEP2 채점 ───────────────────────────────────────────────────────────────

function gradeStep2(
  ws2: XLSX.WorkSheet,
  rawWs: XLSX.WorkSheet | null
): GradeItem[] {
  const items: GradeItem[] = [];

  // 오류유형별 발견 건수 (결과작성_STEP2 C5:C9)
  ANS.step2.errCounts.forEach(({ label, expected, row }) => {
    const actual = cv(ws2, `C${row}`);
    items.push({
      id: `s2_cnt_${row}`,
      label: `오류 발견 건수 · ${label}`,
      hint: expected === 0
        ? `이 유형의 오류는 없습니다 (0건). 수식이 과도하게 잡지 않는지 확인하세요.`
        : `처리상태=정상 조건을 포함한 수식으로 K열에 "${label}"이 표시된 행을 세어보세요.`,
      expected,
      actual: actual as number | null,
      pass: numMatch(actual, expected),
    });
  });

  // 거래원장_RAW K열 — 3개 오류 행 감지 여부
  if (rawWs) {
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(rawWs, {
      header: 1,
      defval: null,
    });
    // 행 키 맵 구성: "날짜|지점|직원|고객" → K열값
    const kMap = new Map<string, string | null>();
    for (let ri = 4; ri < rawData.length; ri++) {
      const row = rawData[ri] as (number | string | null)[];
      if (!row || row.length < 11) continue;
      const key = `${row[0]}|${row[1]}|${row[2]}|${row[3]}`;
      const kVal = row[10] != null ? String(row[10]).trim() : null;
      kMap.set(key, kVal || null);
    }

    ANS.step2.errRows.forEach(({ key, label, hint }) => {
      const mapKey = `${key[0]}|${key[1]}|${key[2]}|${key[3]}`;
      const kVal = kMap.get(mapKey) ?? null;
      const hasValue = kVal !== null && kVal !== "";
      items.push({
        id: `s2_k_${key[0]}`,
        label,
        hint,
        expected: "오류유형 표시됨 (비어있지 않음)",
        actual: kVal,
        pass: kVal === null ? null : hasValue,
      });
    });
  }

  return items;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    const sheetsMissing: string[] = [];

    function findSheet(candidates: string[]): XLSX.WorkSheet | null {
      for (const name of candidates) {
        if (wb.SheetNames.includes(name)) return wb.Sheets[name];
      }
      sheetsMissing.push(candidates[0]);
      return null;
    }

    const ws1   = findSheet(["결과작성_STEP1_보고용집계"]);
    const ws2   = findSheet(["결과작성_STEP2_오류찾기"]);
    const wsRaw = findSheet(["거래원장_RAW"]);

    const stepDefs = [
      {
        step: 1,
        title: "STEP 1 · 보고용 집계표 (지점별 · 상품별 · 직원명 조회)",
        items: ws1 ? gradeStep1(ws1) : [],
      },
      {
        step: 2,
        title: "STEP 2 · 이상 거래 탐지 (K열 오류유형 + 발견 건수)",
        items: ws2 ? gradeStep2(ws2, wsRaw) : [],
      },
    ];

    const steps: StepResult[] = stepDefs.map(({ step, title, items }) => {
      const correct = items.filter((it) => it.pass === true).length;
      return { step, title, items, score: correct, total: items.length };
    });

    const totalScore = steps.reduce((s, st) => s + st.score, 0);
    const totalItems = steps.reduce((s, st) => s + st.total, 0);

    return NextResponse.json({
      steps,
      totalScore,
      totalItems,
      gradeAt: new Date().toISOString(),
      sheetsMissing,
    } satisfies GradeResult);
  } catch (err) {
    console.error("excel-grader error:", err);
    return NextResponse.json(
      { error: "파일 파싱 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

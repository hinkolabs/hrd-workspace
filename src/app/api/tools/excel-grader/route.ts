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

// ─── 정답 키 (v4 기준) ───────────────────────────────────────────────────────
//
// 오류 현황: 거래금액 오류 5건 + 상품유형 오류 3건 (총 8건)
// STEP1: 직원별 통합 집계표 (rows 5~24)
//   B=직원명(VLOOKUP)  D=정상건수  E=정상거래금액  F=정상수수료합계  G=취소오류건수

const EMP_NAMES = [
  "김민준","이서연","박도윤","최하은","정지호",
  "강서준","조지민","윤현우","장수아","임유진",
  "한시우","오예준","서지우","신하린","권민재",
  "황나은","안준호","송다은","류태윤","홍채원",
];

// [정상건수, 정상거래금액, 정상수수료합계, 취소오류건수]
const EMP_DATA: [number, number, number, number][] = [
  [8,  1_550_500_000,  2_753_630, 0],
  [6,  1_418_400_000,  3_547_980, 1],
  [11, 2_583_200_000,  7_068_900, 2],
  [10, 1_769_600_000,  3_062_510, 0],
  [8,  1_930_600_000,  4_841_060, 2],
  [8,  2_654_100_000,  4_014_180, 3],
  [10, 1_280_400_000,  3_015_520, 0],
  [10, 2_835_800_000,  6_170_200, 3],
  [8,  2_208_000_000,  2_890_410, 0],
  [7,  1_301_200_000,  2_054_780, 2],
  [4,    152_100_000,    362_020, 2],
  [12, 2_335_700_000,  4_971_880, 2],
  [8,  1_683_600_000,  3_992_350, 2],
  [11, 2_344_500_000,  4_192_220, 1],
  [6,  2_083_100_000,  4_285_510, 0],
  [6,  1_861_400_000,  3_546_230, 2],
  [13, 3_442_000_000,  6_339_080, 0],
  [8,  1_816_900_000,  4_923_520, 3],
  [6,  1_973_900_000,  4_310_400, 3],
  [8,  1_925_600_000,  4_019_350, 3],
];

// STEP2: 오류유형별 발견 건수 (C5:C6)
const ERR_COUNTS = [
  { row: 5, label: "거래금액 오류",  expected: 5 },
  { row: 6, label: "상품유형 오류",  expected: 3 },
];

// STEP2: K열에 표시되어야 하는 8개 오류 행 (날짜·지점·직원·고객 키)
const ERR_ROWS = [
  { key: [20250101, "B002", "E007", "C032"] as const, label: "K열 · 20250101 B002 E007 (거래금액=0)" },
  { key: [20250102, "B001", "E011", "C041"] as const, label: "K열 · 20250102 B001 E011 (거래금액=0)" },
  { key: [20250103, "B002", "E012", "C018"] as const, label: "K열 · 20250103 B002 E012 (상품유형=FX)" },
  { key: [20250103, "B004", "E009", "C075"] as const, label: "K열 · 20250103 B004 E009 (거래금액=0)" },
  { key: [20250103, "B004", "E014", "C073"] as const, label: "K열 · 20250103 B004 E014 (상품유형=FWD)" },
  { key: [20250104, "B004", "E004", "C066"] as const, label: "K열 · 20250104 B004 E004 (거래금액=0)" },
  { key: [20250104, "B005", "E005", "C016"] as const, label: "K열 · 20250104 B005 E005 (거래금액=0)" },
  { key: [20250122, "B002", "E017", "C065"] as const, label: "K열 · 20250122 B002 E017 (상품유형=ETF)" },
];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function cv(ws: XLSX.WorkSheet, ref: string): number | string | null {
  const c = ws[ref];
  return c ? (c.v ?? null) : null;
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

// ─── STEP1 채점 ───────────────────────────────────────────────────────────────
// 통합 직원별 집계표: rows 5~24
// B=직원명(VLOOKUP)  D=정상건수  E=정상거래금액  F=정상수수료합계  G=취소오류건수

function gradeStep1(ws: XLSX.WorkSheet): GradeItem[] {
  const items: GradeItem[] = [];

  EMP_NAMES.forEach((name, i) => {
    const empId = `E${String(i + 1).padStart(3, "0")}`;
    const r = 5 + i;

    // 직원명 VLOOKUP (B열)
    const nameActual = cv(ws, `B${r}`);
    items.push({
      id: `s1_name_${i}`,
      label: `직원명 조회 · ${empId}`,
      hint: `=VLOOKUP(A${r}, 직원마스터!A:B, 2, 0)`,
      expected: name,
      actual: nameActual as string | null,
      pass: strMatch(nameActual, name),
    });

    // 정상 거래금액 (E열)
    const [cnt, amt, fee, err] = EMP_DATA[i];
    const amtActual = cv(ws, `E${r}`);
    items.push({
      id: `s1_amt_${i}`,
      label: `정상 거래금액 · ${empId}`,
      hint: `=SUMIFS(거래원장_RAW!G:G, 거래원장_RAW!C:C, A${r}, 거래원장_RAW!J:J, "정상")`,
      expected: amt,
      actual: amtActual as number | null,
      pass: numMatch(amtActual, amt),
    });

    // 정상 수수료합계 (F열)
    const feeActual = cv(ws, `F${r}`);
    items.push({
      id: `s1_fee_${i}`,
      label: `정상 수수료합계 · ${empId}`,
      hint: `=SUMIFS(거래원장_RAW!I:I, 거래원장_RAW!C:C, A${r}, 거래원장_RAW!J:J, "정상")`,
      expected: fee,
      actual: feeActual as number | null,
      pass: numMatch(feeActual, fee),
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

  // 오류유형별 발견 건수 (C5:C6)
  ERR_COUNTS.forEach(({ row, label, expected }) => {
    const actual = cv(ws2, `C${row}`);
    items.push({
      id: `s2_cnt_${row}`,
      label: `오류 발견 건수 · ${label}`,
      hint: expected === 0
        ? "이 유형의 오류는 없습니다 (0건)."
        : `K열에 "${label}"이 표시된 행을 COUNTIF로 세거나 직접 확인하세요. (${expected}건)`,
      expected,
      actual: actual as number | null,
      pass: numMatch(actual, expected),
    });
  });

  // K열 감지 여부 (8개 오류 행)
  if (rawWs) {
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(rawWs, {
      header: 1,
      defval: null,
    });

    const kMap = new Map<string, string | null>();
    for (let ri = 4; ri < rawData.length; ri++) {
      const row = rawData[ri] as (number | string | null)[];
      if (!row || row.length < 11) continue;
      const mapKey = `${row[0]}|${row[1]}|${row[2]}|${row[3]}`;
      const kVal = row[10] != null ? String(row[10]).trim() : null;
      kMap.set(mapKey, kVal || null);
    }

    ERR_ROWS.forEach(({ key, label }) => {
      const mapKey = `${key[0]}|${key[1]}|${key[2]}|${key[3]}`;
      const kVal = kMap.get(mapKey) ?? null;
      items.push({
        id: `s2_k_${key[0]}_${key[2]}`,
        label,
        hint: "거래원장_RAW K열에 오류유형을 입력하세요 (수식 또는 직접 입력).",
        expected: "오류유형 표시됨",
        actual: kVal,
        pass: kVal === null ? null : kVal !== "",
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
        title: "STEP 1 · 직원별 통합 집계표 (직원명 조회 + 거래금액 + 수수료합계)",
        items: ws1 ? gradeStep1(ws1) : [],
      },
      {
        step: 2,
        title: "STEP 2 · 이상 거래 탐지 (거래금액 오류 5건 + 상품유형 오류 3건)",
        items: ws2 ? gradeStep2(ws2, wsRaw) : [],
      },
    ];

    const steps: StepResult[] = stepDefs.map(({ step, title, items }) => ({
      step,
      title,
      items,
      score: items.filter((it) => it.pass === true).length,
      total: items.length,
    }));

    return NextResponse.json({
      steps,
      totalScore: steps.reduce((s, st) => s + st.score, 0),
      totalItems: steps.reduce((s, st) => s + st.total, 0),
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

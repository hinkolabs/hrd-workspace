import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeItem {
  id: string;
  label: string;
  hint: string;          // 어떤 함수/방법으로 구해야 하는지
  expected: number | string;
  actual: number | string | null;
  pass: boolean | null;  // null = 빈칸 (미작성)
  tolerance?: number;
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

// ─── 정답 키 ────────────────────────────────────────────────────────────────

const ANSWER = {
  step1: {
    // 상품종류별 정상 거래금액 합계 (B5:B9)
    productAmounts: [
      { label: "주식", expected: 14_089_100_000, hint: "SUMIFS(거래금액, 상품종류, 주식, 처리상태, 정상)" },
      { label: "채권", expected: 9_652_600_000,  hint: "SUMIFS(거래금액, 상품종류, 채권, 처리상태, 정상)" },
      { label: "펀드", expected: 7_759_700_000,  hint: "SUMIFS(거래금액, 상품종류, 펀드, 처리상태, 정상)" },
      { label: "ELS",  expected: 4_594_500_000,  hint: "SUMIFS(거래금액, 상품종류, ELS, 처리상태, 정상)" },
      { label: "RP",   expected: 3_601_400_000,  hint: "SUMIFS(거래금액, 상품종류, RP, 처리상태, 정상)" },
    ],
    // 지점코드별 정상 수수료금액 합계 (E5:E9)
    branchFees: [
      { label: "B001", expected: 10_567_960, hint: "SUMIFS(수수료금액, 지점코드, B001, 처리상태, 정상)" },
      { label: "B002", expected: 16_692_620, hint: "SUMIFS(수수료금액, 지점코드, B002, 처리상태, 정상)" },
      { label: "B003", expected: 22_129_920, hint: "SUMIFS(수수료금액, 지점코드, B003, 처리상태, 정상)" },
      { label: "B004", expected: 15_425_560, hint: "SUMIFS(수수료금액, 지점코드, B004, 처리상태, 정상)" },
      { label: "B005", expected: 15_720_100, hint: "SUMIFS(수수료금액, 지점코드, B005, 처리상태, 정상)" },
    ],
    // 처리상태 건수 (B13:B15)
    statusCounts: [
      { label: "정상", expected: 166, hint: "COUNTIF(처리상태, 정상)" },
      { label: "미달", expected: 21,  hint: "COUNTIF(처리상태, 미달)" },
      { label: "초과", expected: 13,  hint: "COUNTIF(처리상태, 초과)" },
    ],
  },
  step2: {
    // 지점별 상품 거래금액 피벗 (B5:F9)
    branchProducts: [
      { branch: "B001", amounts: [3_331_000_000, 1_436_900_000, 726_600_000, 0, 777_000_000] },
      { branch: "B002", amounts: [3_078_400_000, 1_832_400_000, 1_767_800_000, 1_128_600_000, 371_300_000] },
      { branch: "B003", amounts: [2_360_100_000, 2_626_700_000, 703_200_000, 2_068_400_000, 1_144_400_000] },
      { branch: "B004", amounts: [1_840_500_000, 1_135_600_000, 4_317_100_000, 1_121_400_000, 318_400_000] },
      { branch: "B005", amounts: [3_479_100_000, 2_621_000_000, 245_000_000, 276_100_000, 990_300_000] },
    ],
    products: ["주식", "채권", "펀드", "ELS", "RP"],
    // 직원 목록 VLOOKUP 결과 (I5:I24 = 직원명)
    employeeNames: [
      "강서연", "박지현", "노재현", "이승현", "최민준",
      "강민재", "최지현", "김태희", "이준서", "정우진",
      "나현석", "이선아", "박민준", "정수현", "윤지혜",
      "이준서", "박서현", "김지원", "최준혁", "이민정",
    ],
  },
  step3: {
    // 지점별 월별 금액·성장률
    branchGrowth: [
      { branch: "B001", jan: 2_060_500_000, feb: 998_800_000, febGrowth: -0.5153, mar: 3_212_200_000, marGrowth: 2.2161 },
      { branch: "B002", jan: 2_728_600_000, feb: 3_179_500_000, febGrowth: 0.1652, mar: 2_270_400_000, marGrowth: -0.2859 },
      { branch: "B003", jan: 1_845_700_000, feb: 3_668_000_000, febGrowth: 0.9873, mar: 3_389_100_000, marGrowth: -0.0760 },
      { branch: "B004", jan: 3_031_700_000, feb: 2_886_000_000, febGrowth: -0.0481, mar: 2_815_300_000, marGrowth: -0.0245 },
      { branch: "B005", jan: 2_782_800_000, feb: 2_421_400_000, febGrowth: -0.1299, mar: 2_407_300_000, marGrowth: -0.0058 },
    ],
    // 직원별 총 거래건수 (J5:J24)
    employeeCounts: [8, 7, 13, 10, 10, 11, 10, 13, 8, 9, 6, 15, 10, 12, 6, 8, 12, 7, 11, 10],
  },
} as const;

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function cellVal(ws: XLSX.WorkSheet, ref: string): number | string | null {
  const cell = ws[ref];
  if (!cell) return null;
  return cell.v ?? null;
}

function isClose(
  actual: number | string | null,
  expected: number,
  tolerance = 0.01
): boolean | null {
  if (actual === null || actual === undefined || actual === "") return null;
  const n = typeof actual === "string" ? parseFloat(actual) : actual;
  if (isNaN(n as number)) return null;
  if (expected === 0) return Math.abs(n as number) < 0.001;
  return Math.abs(((n as number) - expected) / expected) <= tolerance;
}

function exactMatch(
  actual: number | string | null,
  expected: string
): boolean | null {
  if (actual === null) return null;
  return String(actual).trim() === expected.trim();
}

function fmtNumber(v: number): string {
  return new Intl.NumberFormat("ko-KR").format(v);
}

// ─── STEP별 채점 ──────────────────────────────────────────────────────────────

function gradeStep1(ws: XLSX.WorkSheet): GradeItem[] {
  const items: GradeItem[] = [];

  // 상품별 거래금액 (B5:B9)
  ANSWER.step1.productAmounts.forEach(({ label, expected, hint }, i) => {
    const actual = cellVal(ws, `B${5 + i}`);
    const pass = isClose(actual, expected, 0);
    items.push({ id: `s1_prod_${i}`, label: `상품 거래금액 합계 · ${label}`, hint, expected, actual: actual as number | null, pass });
  });

  // 지점별 수수료 (E5:E9)
  ANSWER.step1.branchFees.forEach(({ label, expected, hint }, i) => {
    const actual = cellVal(ws, `E${5 + i}`);
    const pass = isClose(actual, expected, 0);
    items.push({ id: `s1_fee_${i}`, label: `지점 수수료 합계 · ${label}`, hint, expected, actual: actual as number | null, pass });
  });

  // 처리상태 건수 (B13:B15)
  ANSWER.step1.statusCounts.forEach(({ label, expected, hint }, i) => {
    const actual = cellVal(ws, `B${13 + i}`);
    const pass = isClose(actual, expected, 0);
    items.push({ id: `s1_cnt_${i}`, label: `처리상태 건수 · ${label}`, hint, expected, actual: actual as number | null, pass });
  });

  return items;
}

function gradeStep2(ws: XLSX.WorkSheet): GradeItem[] {
  const items: GradeItem[] = [];
  const colMap = ["B", "C", "D", "E", "F"];

  // 지점×상품 피벗 (B5:F9)
  ANSWER.step2.branchProducts.forEach(({ branch, amounts }, rowIdx) => {
    ANSWER.step2.products.forEach((product, colIdx) => {
      const cellRef = `${colMap[colIdx]}${5 + rowIdx}`;
      const actual = cellVal(ws, cellRef);
      const expected = amounts[colIdx];
      const pass = isClose(actual, expected, 0);
      items.push({
        id: `s2_bp_${rowIdx}_${colIdx}`,
        label: `지점×상품 집계 · ${branch} / ${product}`,
        hint: `SUMIFS(거래금액, 지점코드, ${branch}, 상품종류, ${product}, 처리상태, 정상)`,
        expected,
        actual: actual as number | null,
        pass,
      });
    });
  });

  // 직원명 VLOOKUP (I5:I24)
  ANSWER.step2.employeeNames.forEach((name, i) => {
    const actual = cellVal(ws, `I${5 + i}`);
    const pass = exactMatch(actual, name);
    items.push({
      id: `s2_emp_${i}`,
      label: `직원명 조회 · E${String(i + 1).padStart(3, "0")}`,
      hint: "XLOOKUP(직원ID, 직원마스터!ID열, 직원마스터!이름열)",
      expected: name,
      actual: actual as string | null,
      pass,
    });
  });

  return items;
}

function gradeStep3(ws: XLSX.WorkSheet): GradeItem[] {
  const items: GradeItem[] = [];
  const GROWTH_TOL = 0.002; // 성장률은 소수점 오차 허용

  // 지점별 월별 금액·성장률 (B5:F9)
  ANSWER.step3.branchGrowth.forEach(
    ({ branch, jan, feb, febGrowth, mar, marGrowth }, i) => {
      const row = 5 + i;
      const checks = [
        { col: "B", expected: jan, label: `1월 거래금액 · ${branch}`, tol: 0 },
        { col: "C", expected: feb, label: `2월 거래금액 · ${branch}`, tol: 0 },
        { col: "D", expected: febGrowth, label: `2월 성장률 · ${branch}`, tol: GROWTH_TOL },
        { col: "E", expected: mar, label: `3월 거래금액 · ${branch}`, tol: 0 },
        { col: "F", expected: marGrowth, label: `3월 성장률 · ${branch}`, tol: GROWTH_TOL },
      ];
      checks.forEach(({ col, expected, label, tol }) => {
        const actual = cellVal(ws, `${col}${row}`);
        const pass = isClose(actual, expected, tol);
        items.push({
          id: `s3_bg_${i}_${col}`,
          label,
          hint: col === "D" || col === "F"
            ? "(당월 - 전월) / 전월 (소수)"
            : `SUMIFS(거래금액, 지점코드, ${branch}, 처리상태, 정상, 월, ${col === "B" ? "1" : col === "C" || col === "D" ? "2" : "3"}월)`,
          expected,
          actual: actual as number | null,
          pass,
          tolerance: tol,
        });
      });
    }
  );

  // 직원별 총 거래건수 (J5:J24)
  ANSWER.step3.employeeCounts.forEach((expected, i) => {
    const actual = cellVal(ws, `J${5 + i}`);
    const pass = isClose(actual, expected, 0);
    items.push({
      id: `s3_cnt_${i}`,
      label: `직원 총 거래건수 · E${String(i + 1).padStart(3, "0")}`,
      hint: "COUNTIF(거래원장 직원ID열, 직원ID)",
      expected,
      actual: actual as number | null,
      pass,
    });
  });

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

    const STEP_SHEET_NAMES = [
      ["결과작성_STEP1", "결과완성_STEP1"],
      ["결과작성_STEP2", "결과완성_STEP2"],
      ["결과작성_STEP3", "결과완성_STEP3"],
    ];

    const sheetsMissing: string[] = [];

    function findSheet(candidates: string[]): XLSX.WorkSheet | null {
      for (const name of candidates) {
        if (wb.SheetNames.includes(name)) return wb.Sheets[name];
      }
      sheetsMissing.push(candidates[0]);
      return null;
    }

    const ws1 = findSheet(STEP_SHEET_NAMES[0]);
    const ws2 = findSheet(STEP_SHEET_NAMES[1]);
    const ws3 = findSheet(STEP_SHEET_NAMES[2]);

    const stepDefs = [
      {
        step: 1,
        title: "STEP 1 · 상품/지점/처리상태 기본 집계",
        items: ws1 ? gradeStep1(ws1) : [],
      },
      {
        step: 2,
        title: "STEP 2 · 지점×상품 피벗 + 직원명 조회",
        items: ws2 ? gradeStep2(ws2) : [],
      },
      {
        step: 3,
        title: "STEP 3 · 월별 성장률 + 직원 총 거래건수",
        items: ws3 ? gradeStep3(ws3) : [],
      },
    ];

    const steps: StepResult[] = stepDefs.map(({ step, title, items }) => {
      const answered = items.filter((it) => it.pass !== null);
      const correct = items.filter((it) => it.pass === true);
      return { step, title, items, score: correct.length, total: items.length };
    });

    const totalScore = steps.reduce((s, st) => s + st.score, 0);
    const totalItems = steps.reduce((s, st) => s + st.total, 0);

    const result: GradeResult = {
      steps,
      totalScore,
      totalItems,
      gradeAt: new Date().toISOString(),
      sheetsMissing,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("excel-grader error:", err);
    return NextResponse.json({ error: "파일 파싱 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// 만다라트 반복(주기) 설정 관련 공용 헬퍼 — 에디터/읽기전용 뷰/할일목록에서 공유
import type { CycleType } from "./growth-types";

export const CYCLE_LABELS: Record<CycleType, string> = {
  none: "1회",
  daily: "일",
  weekly: "주",
  monthly: "월",
  quarterly: "분기",
  yearly: "매년",
  weekday: "요일지정",
};

export const CYCLE_COUNT_UNIT: Record<CycleType, string> = {
  none: "",
  daily: "하루",
  weekly: "주",
  monthly: "월",
  quarterly: "분기",
  yearly: "연",
  weekday: "해당 요일",
};

export const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** ISO 주차 기준 연도 (12/31~1/1 경계에서 실제 연도와 다를 수 있음) */
function isoWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

export function getPeriodKey(ct: CycleType, d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (ct === "daily" || ct === "weekday") return `${y}-${m}-${day}`;
  if (ct === "weekly") return `${y}-W${String(getISOWeek(d)).padStart(2, "0")}`;
  if (ct === "monthly") return `${y}-${m}`;
  if (ct === "quarterly") return `${y}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  if (ct === "yearly") return `${y}`;
  return "all";
}

export function formatCycleBadge(cycleType: CycleType, cycleWeekdays: number[] | null, cycleCount: number): string | null {
  if (cycleType === "none") return null;
  if (cycleType === "weekday") {
    const days = (cycleWeekdays ?? []).sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]).join("·");
    const label = days || "요일미설정";
    return cycleCount > 1 ? `${label} ${cycleCount}회` : label;
  }
  return cycleCount > 1 ? `${CYCLE_LABELS[cycleType]} ${cycleCount}회` : CYCLE_LABELS[cycleType];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `from`(포함)일부터 그 해 12/31까지 남은 기간 수 (일/주/월/분기/년/지정요일 단위) */
export function remainingPeriodsInYear(ct: CycleType, weekdays: number[] | null, from: Date): number {
  if (ct === "none") return 0;
  const year = from.getFullYear();
  const yearEnd = new Date(year, 11, 31);
  const start = startOfDay(from);

  if (ct === "daily") {
    return Math.max(0, Math.floor((yearEnd.getTime() - start.getTime()) / 86400000) + 1);
  }
  if (ct === "weekday") {
    const days = weekdays && weekdays.length > 0 ? weekdays : [0, 1, 2, 3, 4, 5, 6];
    let count = 0;
    const cur = new Date(start);
    while (cur <= yearEnd) {
      if (days.includes(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
  if (ct === "weekly") {
    const seen = new Set<string>();
    const cur = new Date(start);
    while (cur <= yearEnd) {
      seen.add(`${isoWeekYear(cur)}-${getISOWeek(cur)}`);
      cur.setDate(cur.getDate() + 1);
    }
    return seen.size;
  }
  if (ct === "monthly") {
    return Math.max(0, 12 - from.getMonth());
  }
  if (ct === "quarterly") {
    const curQ = Math.ceil((from.getMonth() + 1) / 3);
    return Math.max(0, 4 - curQ + 1);
  }
  if (ct === "yearly") return 1;
  return 0;
}

/**
 * checked_periods 형식: `${periodKey}__${repIndex}` — periodKey는 항상 4자리 연도로 시작.
 * 한 기간(period)은 cycleCount만큼의 repIndex가 모두 체크되어야 "완료"로 집계된다.
 * (예: 매일 2회 걷기 → 하루에 2번 다 체크해야 그 날 1건으로 카운트)
 */
export function countCompletedPeriodsThisYear(
  checkedPeriods: string[] | undefined | null,
  year: number,
  cycleCount: number
): number {
  if (!checkedPeriods || checkedPeriods.length === 0) return 0;
  const yearStr = String(year);
  const need = Math.max(1, cycleCount);
  const repsByPeriod = new Map<string, Set<string>>();
  for (const key of checkedPeriods) {
    if (key.slice(0, 4) !== yearStr) continue;
    const sep = key.lastIndexOf("__");
    if (sep === -1) continue;
    const periodKey = key.slice(0, sep);
    const repIndex = key.slice(sep + 2);
    let reps = repsByPeriod.get(periodKey);
    if (!reps) {
      reps = new Set();
      repsByPeriod.set(periodKey, reps);
    }
    reps.add(repIndex);
  }
  let completed = 0;
  for (const reps of repsByPeriod.values()) {
    if (reps.size >= need) completed++;
  }
  return completed;
}

export type CycleProgress = { done: number; total: number; pct: number };

/**
 * 반복 항목의 연간 진행률 — 분모는 "오늘부터 올해 남은 기간" 수(일/주/월 등),
 * 분자는 그중 실제로 완료(횟수 조건 충족)한 기간 수.
 * (예: 매일 2회 걷기, 오늘 기준 올해 152일 남음 → 분모 152, 하루에 2번 다 체크한 날만 분자에 +1)
 */
export function computeCycleProgress(
  cycleType: CycleType,
  weekdays: number[] | null,
  cycleCount: number,
  checkedPeriods: string[] | undefined | null,
  now: Date = new Date()
): CycleProgress {
  if (cycleType === "none") return { done: 0, total: 0, pct: 0 };
  const total = remainingPeriodsInYear(cycleType, weekdays, now);
  const done = countCompletedPeriodsThisYear(checkedPeriods, now.getFullYear(), cycleCount);
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { done, total, pct };
}

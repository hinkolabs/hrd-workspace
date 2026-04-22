"use client";

import type { GrowthCohort } from "./growth-types";

// 기수(cohort) 개념은 UI/API에서 숨김 처리됨.
// 이 훅은 호환성을 위해 남겨두지만 항상 null을 반환합니다.
// DB의 growth_cohorts 테이블과 cohort_id 컬럼은 보존되지만,
// 앱 레이어에서는 기수 개념을 사용하지 않습니다.
export function useCohort() {
  const cohorts: GrowthCohort[] = [];
  const activeCohort: GrowthCohort | null = null;
  const setActiveCohort = (_c: GrowthCohort) => {};
  return { cohorts, activeCohort, setActiveCohort, loading: false };
}

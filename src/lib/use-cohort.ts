"use client";

import { useState, useEffect } from "react";
import type { GrowthCohort } from "./growth-types";

const COHORT_KEY = "hrd-growth-cohort";

const DEFAULT_COHORT = {
  name: "2026년 신입",
  start_date: "2026-04-01",
  end_date: "2027-03-31",
  status: "active",
};

export function useCohort() {
  const [cohorts, setCohorts] = useState<GrowthCohort[]>([]);
  const [activeCohort, setActiveCohortState] = useState<GrowthCohort | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/growth/cohorts")
      .then((r) => r.json())
      .then(async (data: GrowthCohort[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          // No cohorts yet — auto-create a default one
          const res = await fetch("/api/growth/cohorts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(DEFAULT_COHORT),
          });
          if (res.ok) {
            const created: GrowthCohort = await res.json();
            setCohorts([created]);
            setActiveCohortState(created);
          }
          return;
        }

        setCohorts(data);
        const storedId = localStorage.getItem(COHORT_KEY);
        const found =
          data.find((c) => c.id === storedId) ??
          data.find((c) => c.status === "active") ??
          data[0] ??
          null;
        setActiveCohortState(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setActiveCohort(cohort: GrowthCohort) {
    setActiveCohortState(cohort);
    localStorage.setItem(COHORT_KEY, cohort.id);
  }

  return { cohorts, activeCohort, setActiveCohort, loading };
}

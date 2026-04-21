"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/app-shell";

export type GrowthRole = "trainee" | "mentor" | "admin" | null;

export type GrowthRoleInfo = {
  role: GrowthRole;
  dept: string | null;
  isMember: boolean;
  isTrainee: boolean;
  isMentor: boolean; // mentor OR admin (cohort or global)
  isAdmin: boolean;
  loading: boolean;
};

const cache: Record<string, GrowthRoleInfo & { ts: number }> = {};
const CACHE_TTL = 60_000; // 1분

export function useGrowthRole(cohortId: string | undefined): GrowthRoleInfo {
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<GrowthRoleInfo>({
    role: null,
    dept: null,
    isMember: false,
    isTrainee: false,
    isMentor: false,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    // Global admin: skip cohort lookup — always has full access
    if (!authLoading && user?.role === "admin") {
      setInfo({
        role: "admin",
        dept: null,
        isMember: true,
        isTrainee: false,
        isMentor: true,
        isAdmin: true,
        loading: false,
      });
      return;
    }

    if (authLoading) return;
    if (!cohortId) {
      setInfo((prev) => ({ ...prev, loading: false }));
      return;
    }

    const cached = cache[cohortId];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setInfo({ ...cached, loading: false });
      return;
    }

    fetch(`/api/growth/me?cohort_id=${cohortId}`)
      .then((r) => r.json())
      .then((data) => {
        const result: GrowthRoleInfo = {
          role: data.role ?? null,
          dept: data.dept ?? null,
          isMember: !!data.isMember,
          isTrainee: !!data.isTrainee,
          isMentor: !!data.isMentor,
          isAdmin: !!data.isAdmin,
          loading: false,
        };
        cache[cohortId] = { ...result, ts: Date.now() };
        setInfo(result);
      })
      .catch(() => setInfo((prev) => ({ ...prev, loading: false })));
  }, [cohortId, authLoading, user?.role]);

  return info;
}

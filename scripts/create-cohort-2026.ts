/**
 * 2026년 하나증권 신입사원 기수 생성 스크립트
 *
 * 사용법:
 *   npx tsx scripts/create-cohort-2026.ts
 *
 * .env.local 에서 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 읽습니다.
 * 기본 비밀번호: hrdhanaw1!
 *
 * 신입 명단은 아래 TRAINEES 배열을 편집하세요.
 * 이미 존재하는 username 은 건너뜁니다.
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const DEFAULT_PASSWORD = "hrdhanaw1!";

// ── 신입 명단 ────────────────────────────────────────────────
// username: 아이디(영문, 고유해야 함), display_name: 표시 이름, dept: 부서
const TRAINEES: { username: string; display_name: string; dept: string }[] = [
  { username: "trainee01", display_name: "신입01", dept: "WM" },
  { username: "trainee02", display_name: "신입02", dept: "WM" },
  { username: "trainee03", display_name: "신입03", dept: "IB" },
  { username: "trainee04", display_name: "신입04", dept: "IB" },
  { username: "trainee05", display_name: "신입05", dept: "IB" },
  { username: "trainee06", display_name: "신입06", dept: "S&T" },
  { username: "trainee07", display_name: "신입07", dept: "S&T" },
  { username: "trainee08", display_name: "신입08", dept: "리서치" },
  { username: "trainee09", display_name: "신입09", dept: "리서치" },
  { username: "trainee10", display_name: "신입10", dept: "리테일" },
  { username: "trainee11", display_name: "신입11", dept: "리테일" },
  { username: "trainee12", display_name: "신입12", dept: "리테일" },
  { username: "trainee13", display_name: "신입13", dept: "백오피스" },
  { username: "trainee14", display_name: "신입14", dept: "백오피스" },
  { username: "trainee15", display_name: "신입15", dept: "IT" },
  { username: "trainee16", display_name: "신입16", dept: "IT" },
  { username: "trainee17", display_name: "신입17", dept: "컴플" },
  { username: "trainee18", display_name: "신입18", dept: "WM" },
  { username: "trainee19", display_name: "신입19", dept: "WM" },
  { username: "trainee20", display_name: "신입20", dept: "IB" },
  { username: "trainee21", display_name: "신입21", dept: "IB" },
  { username: "trainee22", display_name: "신입22", dept: "S&T" },
  { username: "trainee23", display_name: "신입23", dept: "리서치" },
  { username: "trainee24", display_name: "신입24", dept: "리테일" },
  { username: "trainee25", display_name: "신입25", dept: "리테일" },
  { username: "trainee26", display_name: "신입26", dept: "리테일" },
  { username: "trainee27", display_name: "신입27", dept: "백오피스" },
  { username: "trainee28", display_name: "신입28", dept: "백오피스" },
  { username: "trainee29", display_name: "신입29", dept: "IT" },
  { username: "trainee30", display_name: "신입30", dept: "WM" },
  { username: "trainee31", display_name: "신입31", dept: "WM" },
  { username: "trainee32", display_name: "신입32", dept: "IB" },
  { username: "trainee33", display_name: "신입33", dept: "IB" },
  { username: "trainee34", display_name: "신입34", dept: "S&T" },
  { username: "trainee35", display_name: "신입35", dept: "S&T" },
  { username: "trainee36", display_name: "신입36", dept: "리서치" },
  { username: "trainee37", display_name: "신입37", dept: "리서치" },
  { username: "trainee38", display_name: "신입38", dept: "리테일" },
  { username: "trainee39", display_name: "신입39", dept: "리테일" },
  { username: "trainee40", display_name: "신입40", dept: "백오피스" },
  { username: "trainee41", display_name: "신입41", dept: "IT" },
  { username: "trainee42", display_name: "신입42", dept: "IT" },
  { username: "trainee43", display_name: "신입43", dept: "컴플" },
  { username: "trainee44", display_name: "신입44", dept: "컴플" },
  { username: "trainee45", display_name: "신입45", dept: "WM" },
];

// 기수 설정
const COHORT = {
  name: "2026년 신입",
  start_date: "2026-04-01",
  end_date: "2027-03-31",
};

async function main() {
  console.log("== 2026년 신입 기수 생성 스크립트 ==\n");

  // 1. 기수 생성 또는 조회
  let cohortId: string;
  const { data: existingCohort } = await supabase
    .from("growth_cohorts")
    .select("id")
    .eq("name", COHORT.name)
    .single();

  if (existingCohort) {
    cohortId = existingCohort.id;
    console.log(`기존 기수 사용: ${cohortId}`);
  } else {
    const { data: newCohort, error } = await supabase
      .from("growth_cohorts")
      .insert(COHORT)
      .select("id")
      .single();

    if (error || !newCohort) {
      console.error("기수 생성 실패:", error?.message);
      process.exit(1);
    }
    cohortId = newCohort.id;
    console.log(`새 기수 생성 완료: ${cohortId}`);
  }

  // 2. 사용자 생성 및 멤버 등록
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0, skipped = 0, failed = 0;

  for (const trainee of TRAINEES) {
    // 기존 사용자 확인
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", trainee.username)
      .single();

    let userId: string;

    if (existing) {
      userId = existing.id;
      skipped++;
      process.stdout.write(`SKIP  ${trainee.username} (${trainee.display_name})\n`);
    } else {
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          username: trainee.username,
          password_hash: passwordHash,
          display_name: trainee.display_name,
          is_active: true,
          role: "member",
        })
        .select("id")
        .single();

      if (error || !newUser) {
        console.error(`FAIL  ${trainee.username}: ${error?.message}`);
        failed++;
        continue;
      }
      userId = newUser.id;
      created++;
      process.stdout.write(`OK    ${trainee.username} (${trainee.display_name})\n`);
    }

    // 기수 멤버 등록 (upsert)
    await supabase
      .from("growth_members")
      .upsert(
        { cohort_id: cohortId, user_id: userId, role: "trainee", dept: trainee.dept },
        { onConflict: "cohort_id,user_id" }
      );
  }

  console.log(`\n== 완료 ==`);
  console.log(`생성: ${created}명 | 기존: ${skipped}명 | 실패: ${failed}명`);
  console.log(`초기 비밀번호: ${DEFAULT_PASSWORD}`);
  console.log(`기수 ID: ${cohortId}`);

  // CSV 출력 (계정 목록 배포용)
  const csv = ["username,display_name,dept,password"]
    .concat(TRAINEES.map((t) => `${t.username},${t.display_name},${t.dept},${DEFAULT_PASSWORD}`))
    .join("\n");
  const outPath = path.resolve(process.cwd(), "tmp", "cohort-2026-accounts.csv");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`\n계정 목록 CSV: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

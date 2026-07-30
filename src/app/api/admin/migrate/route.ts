import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionFromCookies } from "@/lib/auth";

const GROWTH_SCHEMA_SQL = `
-- growth_cohorts
create table if not exists growth_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- growth_members
create table if not exists growth_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(cohort_id, user_id)
);

-- growth_mandalarts
create table if not exists growth_mandalarts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete set null,
  center_goal text default '',
  visibility text default 'cohort',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- growth_mandalart_cells
create table if not exists growth_mandalart_cells (
  id uuid primary key default gen_random_uuid(),
  mandalart_id uuid references growth_mandalarts(id) on delete cascade,
  block_idx int not null,
  cell_idx int not null,
  text text default '',
  emoji text default '',
  done boolean default false,
  unique(mandalart_id, block_idx, cell_idx)
);

-- done column migration (for existing tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='growth_mandalart_cells' AND column_name='done') THEN
    ALTER TABLE growth_mandalart_cells ADD COLUMN done boolean default false;
  END IF;
END $$;

-- growth_mandalart_cell_todos
create table if not exists growth_mandalart_cell_todos (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid references growth_mandalart_cells(id) on delete cascade,
  text text not null,
  done boolean default false,
  order_idx int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- growth_mandalart_comments
create table if not exists growth_mandalart_comments (
  id uuid primary key default gen_random_uuid(),
  mandalart_id uuid references growth_mandalarts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- growth_journals
create table if not exists growth_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  title text not null,
  content text,
  mood text,
  images text[] default '{}',
  week_of date,
  visibility text default 'cohort',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- growth_comments
create table if not exists growth_comments (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references growth_journals(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- growth_reactions
create table if not exists growth_reactions (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references growth_journals(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  emoji text not null,
  unique(journal_id, user_id, emoji)
);

-- growth_mentor_threads
create table if not exists growth_mentor_threads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references growth_members(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  mentor_id uuid references users(id) on delete cascade,
  content text not null,
  is_mentor boolean default false,
  created_at timestamptz default now()
);

-- growth_retros
create table if not exists growth_retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  month text not null,
  went_well text,
  improve text,
  next_goal text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month)
);

-- growth_chat_messages
create table if not exists growth_chat_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- cohort_id nullable migration
DO $$ BEGIN
  BEGIN
    ALTER TABLE growth_chat_messages ALTER COLUMN cohort_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 모집 메시지용 kind 컬럼
alter table growth_chat_messages add column if not exists kind text default 'normal';

-- 모집 메시지 참여자
create table if not exists growth_chat_signups (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references growth_chat_messages(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);
create index if not exists idx_chat_signups_msg on growth_chat_signups(message_id, created_at);
alter table growth_chat_signups enable row level security;

-- users role column migration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
    ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member'));
  END IF;
END $$;

-- RLS
alter table growth_cohorts enable row level security;
alter table growth_chat_messages enable row level security;
alter table growth_members enable row level security;
alter table growth_mandalarts enable row level security;
alter table growth_mandalart_cells enable row level security;
alter table growth_mandalart_cell_todos enable row level security;
alter table growth_mandalart_comments enable row level security;
alter table growth_journals enable row level security;
alter table growth_comments enable row level security;
alter table growth_reactions enable row level security;
alter table growth_mentor_threads enable row level security;
alter table growth_retros enable row level security;

-- Policies
DO $$ BEGIN
  if not exists (select 1 from pg_policies where tablename='growth_cohorts' and policyname='Allow all on growth_cohorts') then
    create policy "Allow all on growth_cohorts" on growth_cohorts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_chat_messages' and policyname='Allow all on growth_chat_messages') then
    create policy "Allow all on growth_chat_messages" on growth_chat_messages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_members' and policyname='Allow all on growth_members') then
    create policy "Allow all on growth_members" on growth_members for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_mandalarts' and policyname='Allow all on growth_mandalarts') then
    create policy "Allow all on growth_mandalarts" on growth_mandalarts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_mandalart_cells' and policyname='Allow all on growth_mandalart_cells') then
    create policy "Allow all on growth_mandalart_cells" on growth_mandalart_cells for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_mandalart_cell_todos' and policyname='Allow all on growth_mandalart_cell_todos') then
    create policy "Allow all on growth_mandalart_cell_todos" on growth_mandalart_cell_todos for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_mandalart_comments' and policyname='Allow all on growth_mandalart_comments') then
    create policy "Allow all on growth_mandalart_comments" on growth_mandalart_comments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_journals' and policyname='Allow all on growth_journals') then
    create policy "Allow all on growth_journals" on growth_journals for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_comments' and policyname='Allow all on growth_comments') then
    create policy "Allow all on growth_comments" on growth_comments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_reactions' and policyname='Allow all on growth_reactions') then
    create policy "Allow all on growth_reactions" on growth_reactions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_mentor_threads' and policyname='Allow all on growth_mentor_threads') then
    create policy "Allow all on growth_mentor_threads" on growth_mentor_threads for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_retros' and policyname='Allow all on growth_retros') then
    create policy "Allow all on growth_retros" on growth_retros for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_chat_signups' and policyname='Allow all on growth_chat_signups') then
    create policy "Allow all on growth_chat_signups" on growth_chat_signups for all using (true) with check (true);
  end if;
END $$;

-- ── Theme Achievement Tables ─────────────────────────────────────────────────
create table if not exists growth_theme_categories (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete set null,
  name text not null,
  description text,
  icon_emoji text not null default '🏆',
  order_idx int not null default 0,
  created_at timestamptz default now()
);

create table if not exists growth_theme_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references growth_theme_categories(id) on delete cascade not null,
  name text not null,
  description text,
  order_idx int not null default 0,
  created_at timestamptz default now()
);

create table if not exists growth_theme_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references growth_theme_items(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(item_id, user_id)
);

alter table growth_theme_categories enable row level security;
alter table growth_theme_items enable row level security;
alter table growth_theme_completions enable row level security;

DO $$ BEGIN
  if not exists (select 1 from pg_policies where tablename='growth_theme_categories' and policyname='Allow all on growth_theme_categories') then
    create policy "Allow all on growth_theme_categories" on growth_theme_categories for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_theme_items' and policyname='Allow all on growth_theme_items') then
    create policy "Allow all on growth_theme_items" on growth_theme_items for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_theme_completions' and policyname='Allow all on growth_theme_completions') then
    create policy "Allow all on growth_theme_completions" on growth_theme_completions for all using (true) with check (true);
  end if;
END $$;

-- ── Guide Settings ──────────────────────────────────────────────────────────
create table if not exists growth_guide_settings (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete set null,
  youtube_url text,
  guide_text text,
  updated_at timestamptz default now()
);

alter table growth_guide_settings enable row level security;

DO $$ BEGIN
  if not exists (select 1 from pg_policies where tablename='growth_guide_settings' and policyname='Allow all on growth_guide_settings') then
    create policy "Allow all on growth_guide_settings" on growth_guide_settings for all using (true) with check (true);
  end if;
END $$;

-- ── Required flag on theme items ─────────────────────────────────────────────
alter table growth_theme_items add column if not exists is_required boolean default false;

-- ── Guide settings: second youtube thumbnail ─────────────────────────────────
alter table growth_guide_settings add column if not exists youtube_url_2 text;

-- ── Chat Rooms (서브 채팅방) ─────────────────────────────────────────────────
create table if not exists growth_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references users(id) on delete set null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- room_id column on chat messages
alter table growth_chat_messages add column if not exists room_id uuid references growth_chat_rooms(id) on delete set null;

alter table growth_chat_rooms enable row level security;

DO $$ BEGIN
  if not exists (select 1 from pg_policies where tablename='growth_chat_rooms' and policyname='Allow all on growth_chat_rooms') then
    create policy "Allow all on growth_chat_rooms" on growth_chat_rooms for all using (true) with check (true);
  end if;
END $$;

-- updated_at on mandalart comments (for edit tracking)
alter table growth_mandalart_comments add column if not exists updated_at timestamptz default now();

-- ── 실행항목 주기(반복) 컬럼 ────────────────────────────────────────────────
-- cycle_type: 'none'(단발성) | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekday'
alter table growth_mandalart_cell_todos add column if not exists cycle_type text default 'none';
-- cycle_type = 'weekday'일 때 사용, 0=일 ~ 6=토
alter table growth_mandalart_cell_todos add column if not exists cycle_weekdays int[];
-- 주기당 목표 횟수 (예: cycle_type='daily', cycle_count=2 → "매일 2회")
alter table growth_mandalart_cell_todos add column if not exists cycle_count int default 1;

-- PostgREST 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
`;

export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const results: string[] = [];
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace("https://", "")
    .split(".")[0];
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Try Supabase Management API
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: GROWTH_SCHEMA_SQL }),
    }
  );

  if (mgmtRes.ok) {
    results.push("✅ 성장 커뮤니티 테이블 생성 완료!");

    // Set current user as admin
    const supabase = createServerClient();
    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.userId)
      .single();

    if (userRow && "role" in userRow) {
      await supabase.from("users").update({ role: "admin" }).eq("id", session.userId);
      results.push(`✅ ${session.username} → admin 설정 완료`);
    }
    results.push("✅ 페이지를 새로고침하면 적용됩니다.");
  } else {
    const errText = await mgmtRes.text().catch(() => "");
    results.push(`❌ 자동 실행 실패 (${mgmtRes.status}): Management API 토큰 필요`);
    results.push("📋 아래 SQL을 Supabase Dashboard → SQL Editor에서 실행하세요:");
    results.push("--- SQL START ---");
    results.push(GROWTH_SCHEMA_SQL);
    results.push("--- SQL END ---");
    if (errText) results.push(`상세: ${errText.slice(0, 200)}`);
  }

  return NextResponse.json({ results });
}

export async function GET() {
  // GET 요청으로 SQL만 반환 (브라우저에서 텍스트로 볼 수 있음)
  return new Response(GROWTH_SCHEMA_SQL, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

-- HRD Workspace DB 스키마
-- Supabase SQL Editor에 붙여넣어 실행하세요

-- 메모 테이블
create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  pinned boolean default false,
  color text default 'default',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  updated_by text
);

-- created_by / updated_by 컬럼 추가 (기존 테이블에 적용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memos' AND column_name='created_by') THEN
    ALTER TABLE memos ADD COLUMN created_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memos' AND column_name='updated_by') THEN
    ALTER TABLE memos ADD COLUMN updated_by text;
  END IF;
END $$;

-- 할일 테이블
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'pending',    -- 'pending' | 'in_progress' | 'done'
  priority text default 'medium',   -- 'low' | 'medium' | 'high'
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  updated_by text
);

-- created_by / updated_by 컬럼 추가 (기존 테이블에 적용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='todos' AND column_name='created_by') THEN
    ALTER TABLE todos ADD COLUMN created_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='todos' AND column_name='updated_by') THEN
    ALTER TABLE todos ADD COLUMN updated_by text;
  END IF;
END $$;

-- 문서 변환 히스토리
create table if not exists convert_history (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text,
  file_size int,
  summary text,
  user_display_name text,
  user_id text,
  created_at timestamptz default now()
);

-- 활동 로그 테이블 (메모/할일 생성·수정·삭제 이력)
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,        -- 'memo' | 'todo'
  entity_id uuid,
  entity_title text,
  action text not null,             -- 'create' | 'update' | 'delete'
  user_display_name text,
  user_id text,
  detail text,
  created_at timestamptz default now()
);

-- 팀 채팅 메시지
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null default '익명',
  content text not null,
  created_at timestamptz default now()
);

-- 견적 비교
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  result jsonb,
  file_urls text[],
  created_at timestamptz default now()
);

-- RAG 문서
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  file_url text,
  file_type text default 'text',
  chunk_count int default 0,
  created_at timestamptz default now()
);

-- file_type 컬럼 추가 (기존 테이블에 적용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_type') THEN
    ALTER TABLE documents ADD COLUMN file_type text DEFAULT 'text';
  END IF;
END $$;

-- 업무 보고서
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  period text not null,
  report_type text default 'weekly_work',
  stats jsonb,
  created_at timestamptz default now()
);

-- report_type 컬럼 추가 (기존 테이블에 적용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='report_type') THEN
    ALTER TABLE reports ADD COLUMN report_type text DEFAULT 'weekly_work';
  END IF;
END $$;

-- 지식베이스 Q&A 히스토리
create table if not exists knowledge_qa_history (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sources text[] default '{}',
  created_at timestamptz default now()
);

-- 견적 분석 히스토리
create table if not exists estimate_analyses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text,
  result jsonb not null,
  created_at timestamptz default now()
);

-- 인재개발실 설정
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  file_name text,
  updated_at timestamptz default now(),
  updated_by uuid references users(id)
);

-- 사용자 테이블
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  display_name text not null,
  is_active boolean default true,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz default now()
);

-- 전역 role 컬럼 마이그레이션 (기존 DB에 컬럼이 없으면 추가)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'role'
  ) then
    alter table users add column role text not null default 'member'
      check (role in ('admin','member'));
  end if;
end $$;

-- 기존에 이미 생성된 계정은 전부 admin (HRD 담당자)
-- 이 스크립트를 처음 실행하면 기존 모든 rows가 admin이 됨
-- 새로 스크립트로 생성하는 신입은 default 'member' 사용
update users set role = 'admin' where role = 'member';

-- RAG 임베딩 청크 (pgvector 필요)
-- create extension if not exists vector;
-- create table if not exists document_chunks (
--   id uuid primary key default gen_random_uuid(),
--   document_id uuid references documents(id) on delete cascade,
--   content text not null,
--   embedding vector(1536),
--   created_at timestamptz default now()
-- );

-- Row Level Security (MVP: 전체 공개 허용)
alter table memos enable row level security;
alter table todos enable row level security;
alter table messages enable row level security;
alter table estimates enable row level security;
alter table documents enable row level security;
alter table reports enable row level security;
alter table users enable row level security;
alter table settings enable row level security;
alter table knowledge_qa_history enable row level security;
alter table estimate_analyses enable row level security;
alter table activity_logs enable row level security;
alter table convert_history enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='memos' and policyname='Allow all on memos') then
    create policy "Allow all on memos" on memos for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='todos' and policyname='Allow all on todos') then
    create policy "Allow all on todos" on todos for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='Allow all on messages') then
    create policy "Allow all on messages" on messages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='estimates' and policyname='Allow all on estimates') then
    create policy "Allow all on estimates" on estimates for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='documents' and policyname='Allow all on documents') then
    create policy "Allow all on documents" on documents for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reports' and policyname='Allow all on reports') then
    create policy "Allow all on reports" on reports for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='users' and policyname='Allow all on users') then
    create policy "Allow all on users" on users for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='settings' and policyname='Allow all on settings') then
    create policy "Allow all on settings" on settings for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='knowledge_qa_history' and policyname='Allow all on knowledge_qa_history') then
    create policy "Allow all on knowledge_qa_history" on knowledge_qa_history for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='estimate_analyses' and policyname='Allow all on estimate_analyses') then
    create policy "Allow all on estimate_analyses" on estimate_analyses for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='activity_logs' and policyname='Allow all on activity_logs') then
    create policy "Allow all on activity_logs" on activity_logs for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='convert_history' and policyname='Allow all on convert_history') then
    create policy "Allow all on convert_history" on convert_history for all using (true) with check (true);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- 홍보 캠페인 테이블
-- ═══════════════════════════════════════════════════════════

-- 캠페인 마스터
create table if not exists promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  type text not null,                   -- 'quiz' | 'info_card'
  status text default 'draft',          -- 'draft' | 'active' | 'archived'
  description text,
  cta_text text default '자세히 보기',
  cta_url text,
  cta_description text,
  og_title text,
  og_description text,
  og_image_url text,
  theme_color text default '#4F46E5',
  cover_emoji text default '✨',
  cover_image_url text,
  view_count int default 0,
  cta_click_count int default 0,
  share_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 퀴즈 질문
create table if not exists promo_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references promo_campaigns(id) on delete cascade,
  question_text text not null,
  question_emoji text,
  sort_order int default 0,
  options jsonb not null default '[]'   -- [{text, emoji, scores: {A:2, B:0}}]
);

-- 퀴즈 결과 유형
create table if not exists promo_quiz_results (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references promo_campaigns(id) on delete cascade,
  result_key text not null,
  result_emoji text,
  title text not null,
  description text,
  image_url text
);

-- 정보카드 섹션
create table if not exists promo_info_sections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references promo_campaigns(id) on delete cascade,
  sort_order int default 0,
  title text not null,
  content text,
  image_url text,
  icon text
);

alter table promo_campaigns enable row level security;
alter table promo_quiz_questions enable row level security;
alter table promo_quiz_results enable row level security;
alter table promo_info_sections enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='promo_campaigns' and policyname='Allow all on promo_campaigns') then
    create policy "Allow all on promo_campaigns" on promo_campaigns for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='promo_quiz_questions' and policyname='Allow all on promo_quiz_questions') then
    create policy "Allow all on promo_quiz_questions" on promo_quiz_questions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='promo_quiz_results' and policyname='Allow all on promo_quiz_results') then
    create policy "Allow all on promo_quiz_results" on promo_quiz_results for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='promo_info_sections' and policyname='Allow all on promo_info_sections') then
    create policy "Allow all on promo_info_sections" on promo_info_sections for all using (true) with check (true);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- ICE 프레임워크 테이블
-- ═══════════════════════════════════════════════════════════

-- ICE 세션 (프로젝트 단위)
create table if not exists ice_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'draft',  -- draft | collecting | scoring | completed
  survey_intro text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 설문 질문
create table if not exists ice_survey_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ice_sessions(id) on delete cascade,
  question_text text not null,
  question_type text default 'textarea',  -- text | textarea | select
  options jsonb,
  sort_order int default 0,
  required boolean default true
);

-- 설문 응답
create table if not exists ice_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ice_sessions(id) on delete cascade,
  respondent_name text not null,
  respondent_dept text,
  answers jsonb not null,
  created_at timestamptz default now()
);

-- ICE 채점 결과
create table if not exists ice_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references ice_sessions(id) on delete cascade,
  pain_point text not null,
  source_response_id uuid references ice_responses(id),
  impact int not null default 5,
  confidence int not null default 5,
  ease int not null default 5,
  note text,
  scored_by text,
  created_at timestamptz default now()
);

alter table ice_sessions enable row level security;
alter table ice_survey_questions enable row level security;
alter table ice_responses enable row level security;
alter table ice_scores enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='ice_sessions' and policyname='Allow all on ice_sessions') then
    create policy "Allow all on ice_sessions" on ice_sessions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='ice_survey_questions' and policyname='Allow all on ice_survey_questions') then
    create policy "Allow all on ice_survey_questions" on ice_survey_questions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='ice_responses' and policyname='Allow all on ice_responses') then
    create policy "Allow all on ice_responses" on ice_responses for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='ice_scores' and policyname='Allow all on ice_scores') then
    create policy "Allow all on ice_scores" on ice_scores for all using (true) with check (true);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- ALLI.AI 교육 시나리오 테이블
-- ═══════════════════════════════════════════════════════════

-- 교육 시나리오 마스터
create table if not exists training_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_key text unique not null,       -- 'research-qa', 'sop-agent' 등
  title text not null,
  description text,
  target_dept text,                        -- 대상 부서
  alli_features text[],                    -- 활용 ALLI.AI 기능
  difficulty text default 'intermediate',  -- beginner | intermediate | advanced
  duration_minutes int default 60,
  ice_impact int,
  ice_confidence int,
  ice_ease int,
  ice_total int generated always as (ice_impact + ice_confidence + ice_ease) stored,
  sort_order int default 0,
  steps jsonb,                             -- 실습 단계별 가이드 [{step, title, description}]
  materials text[],                        -- 준비물 목록
  eval_criteria text[],                    -- 평가 기준
  system_prompt text,                      -- 시나리오별 AI 시스템 프롬프트
  created_at timestamptz default now()
);

-- 교육 진행 추적
create table if not exists training_progress (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references training_scenarios(id) on delete cascade,
  user_id text not null,
  user_display_name text,
  status text default 'not_started',       -- not_started | in_progress | completed
  current_step int default 0,
  started_at timestamptz,
  completed_at timestamptz,
  eval_score jsonb,                        -- 평가 결과
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table training_scenarios enable row level security;
alter table training_progress enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='training_scenarios' and policyname='Allow all on training_scenarios') then
    create policy "Allow all on training_scenarios" on training_scenarios for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='training_progress' and policyname='Allow all on training_progress') then
    create policy "Allow all on training_progress" on training_progress for all using (true) with check (true);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- 신입 성장 커뮤니티 테이블
-- ═══════════════════════════════════════════════════════════

-- 기수 마스터
create table if not exists growth_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                          -- '2026년 신입'
  start_date date not null,
  end_date date not null,
  status text default 'active',                -- 'active' | 'completed' | 'archived'
  created_at timestamptz default now()
);

-- 기수 멤버십
create table if not exists growth_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'trainee',                 -- 'trainee' | 'mentor' | 'admin'
  dept text,
  unique(cohort_id, user_id)
);

-- 만다라트 컨테이너
create table if not exists growth_mandalarts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  center_goal text,
  visibility text default 'cohort',            -- 'private' | 'cohort'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 만다라트 셀 (81칸: 9블록 × 9셀)
create table if not exists growth_mandalart_cells (
  id uuid primary key default gen_random_uuid(),
  mandalart_id uuid references growth_mandalarts(id) on delete cascade,
  block_idx int not null,                      -- 0..8 (4=중앙 블록)
  cell_idx int not null,                       -- 0..8 (4=해당 블록 중앙)
  text text default '',
  emoji text default '',
  done boolean default false,
  unique(mandalart_id, block_idx, cell_idx)
);

-- 성장일기
create table if not exists growth_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  title text not null,
  content text,                                -- markdown
  mood text,                                   -- '😊' | '😐' | '😔' | '🔥' | '💪'
  images text[] default '{}',
  week_of date,                                -- 해당 주 월요일 날짜
  visibility text default 'cohort',            -- 'private' | 'cohort'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 댓글
create table if not exists growth_comments (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references growth_journals(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  parent_id uuid references growth_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- 이모지 리액션
create table if not exists growth_reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,                   -- 'journal' | 'comment'
  target_id uuid not null,
  user_id uuid references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(target_type, target_id, user_id, emoji)
);

-- 1:1 멘토 스레드
create table if not exists growth_mentor_threads (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid references users(id) on delete cascade,
  mentor_id uuid references users(id) on delete set null,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  title text default '멘토 대화',
  status text default 'active',               -- 'active' | 'closed'
  created_at timestamptz default now()
);

-- 1:1 멘토 메시지
create table if not exists growth_mentor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references growth_mentor_threads(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text not null,
  attachments text[] default '{}',
  created_at timestamptz default now()
);

-- 월간 회고
create table if not exists growth_retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  month text not null,                         -- 'yyyy-mm'
  achievements text,
  learnings text,
  next_goals text,
  mentor_feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, cohort_id, month)
);

-- 기수별 팀 채팅
create table if not exists growth_chat_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references growth_cohorts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table growth_cohorts enable row level security;
alter table growth_chat_messages enable row level security;
alter table growth_members enable row level security;
alter table growth_mandalarts enable row level security;
alter table growth_mandalart_cells enable row level security;
alter table growth_journals enable row level security;
alter table growth_comments enable row level security;
alter table growth_reactions enable row level security;
alter table growth_mentor_threads enable row level security;
alter table growth_mentor_messages enable row level security;
alter table growth_retros enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='growth_chat_messages' and policyname='Allow all on growth_chat_messages') then
    create policy "Allow all on growth_chat_messages" on growth_chat_messages for all using (true) with check (true);
  end if;
  -- 기수/멤버/만다라트/셀/댓글/리액션/회고: 전체 공개
  if not exists (select 1 from pg_policies where tablename='growth_cohorts' and policyname='Allow all on growth_cohorts') then
    create policy "Allow all on growth_cohorts" on growth_cohorts for all using (true) with check (true);
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
  if not exists (select 1 from pg_policies where tablename='growth_mentor_messages' and policyname='Allow all on growth_mentor_messages') then
    create policy "Allow all on growth_mentor_messages" on growth_mentor_messages for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='growth_retros' and policyname='Allow all on growth_retros') then
    create policy "Allow all on growth_retros" on growth_retros for all using (true) with check (true);
  end if;
end $$;

-- ─── Decks (Slot-based slide decks) ──────────────────────────────────────────
create table if not exists decks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slot_deck   jsonb not null,
  owner       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='decks' and policyname='Allow all on decks') then
    alter table decks enable row level security;
    create policy "Allow all on decks" on decks for all using (true) with check (true);
  end if;
end $$;

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
  created_at timestamptz default now()
);

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

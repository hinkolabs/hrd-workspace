/** 오프라인 팀 대항 퀴즈. 참가자 키로는 정답 테이블을 읽지 못한다. */
export const LIVE_QUIZ_SCHEMA_SQL = `
create table if not exists quiz_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text unique,
  public_path text unique,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended', 'cancelled')),
  phase text not null default 'edit' check (phase in ('edit', 'lobby', 'question', 'closed', 'reveal', 'final', 'ended')),
  current_question_id uuid,
  question_started_at timestamptz,
  question_ends_at timestamptz,
  roster_locked boolean not null default false,
  final_step int not null default 0 check (final_step between 0 and 2),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  ended_at timestamptz
);

create table if not exists quiz_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  name text not null,
  sort_order int not null check (sort_order between 1 and 24),
  expected_size int not null default 5 check (expected_size between 1 and 99),
  locked_size int,
  unique (event_id, sort_order),
  unique (event_id, name)
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  sort_order int not null check (sort_order between 1 and 10),
  kind text not null check (kind in ('choice', 'short')),
  scope text not null default 'team' check (scope in ('team', 'individual')),
  prompt text not null default '',
  image_data text,
  has_image boolean not null default false,
  options jsonb not null default '[]',
  correct_option_id text,
  accepted_answers text[] not null default '{}',
  ignore_spaces boolean not null default true,
  time_limit int not null default 30 check (time_limit between 10 and 90),
  points int not null default 100 check (points between 1 and 1000),
  explanation text not null default '',
  unique (event_id, sort_order)
);

create table if not exists quiz_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  team_id uuid not null references quiz_teams(id) on delete cascade,
  join_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  participant_id uuid not null references quiz_participants(id) on delete cascade,
  team_id uuid not null references quiz_teams(id) on delete cascade,
  answer_text text not null default '',
  option_id text,
  is_correct boolean not null default false,
  override_correct boolean,
  submitted_at timestamptz not null default now(),
  unique (question_id, participant_id)
);

create table if not exists quiz_question_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  team_id uuid not null references quiz_teams(id) on delete cascade,
  correct_count int not null,
  roster_size int not null,
  points_scaled bigint not null,
  unique (question_id, team_id)
);

create table if not exists quiz_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quiz_events(id) on delete cascade,
  actor text,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists quiz_teams_event_idx on quiz_teams (event_id);
create index if not exists quiz_questions_event_idx on quiz_questions (event_id);
create index if not exists quiz_participants_event_idx on quiz_participants (event_id);
create index if not exists quiz_answers_event_idx on quiz_answers (event_id);
create index if not exists quiz_question_results_event_idx on quiz_question_results (event_id);

alter table quiz_events enable row level security;
alter table quiz_teams enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_participants enable row level security;
alter table quiz_answers enable row level security;
alter table quiz_question_results enable row level security;
alter table quiz_audit_logs enable row level security;

alter table quiz_questions add column if not exists scope text not null default 'team';
alter table quiz_questions drop constraint if exists quiz_questions_scope_check;
alter table quiz_questions add constraint quiz_questions_scope_check check (scope in ('team', 'individual'));

alter table quiz_participants add column if not exists nickname text not null default '';
create unique index if not exists quiz_participants_nickname_idx on quiz_participants (event_id, lower(nickname)) where nickname <> '';

notify pgrst, 'reload schema';
`;

export const QUIZ_NICKNAME_SQL = `alter table quiz_participants add column if not exists nickname text not null default '';
create unique index if not exists quiz_participants_nickname_idx on quiz_participants (event_id, lower(nickname)) where nickname <> '';
notify pgrst, 'reload schema';`;

export const QUIZ_SCOPE_SQL = `alter table quiz_questions add column if not exists scope text not null default 'team';
alter table quiz_questions drop constraint if exists quiz_questions_scope_check;
alter table quiz_questions add constraint quiz_questions_scope_check check (scope in ('team', 'individual'));
notify pgrst, 'reload schema';`;

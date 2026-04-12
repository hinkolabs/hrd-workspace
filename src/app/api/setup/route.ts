import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const CREATE_SQL = `
create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  pinned boolean default false,
  color text default 'default',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'pending',
  priority text default 'medium',
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists memos enable row level security;
alter table if exists todos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'memos' and policyname = 'Allow all on memos'
  ) then
    create policy "Allow all on memos" on memos for all using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'todos' and policyname = 'Allow all on todos'
  ) then
    create policy "Allow all on todos" on todos for all using (true) with check (true);
  end if;
end $$;
`;

export async function POST() {
  try {
    const supabase = createServerClient();

    // Supabase Management API로 SQL 실행
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const projectRef = url.replace("https://", "").split(".")[0];

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: CREATE_SQL }),
      }
    );

    if (!res.ok) {
      // Management API 실패 시 — 테이블 존재 여부만 확인
      const { error } = await supabase.from("memos").select("id").limit(1);
      if (error?.code === "PGRST205") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "테이블이 없습니다. Supabase 대시보드 SQL Editor에서 supabase-schema.sql을 실행해주세요.",
            sql_url: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
          },
          { status: 422 }
        );
      }
      return NextResponse.json({ ok: true, message: "테이블 이미 존재함" });
    }

    return NextResponse.json({ ok: true, message: "테이블 생성 완료" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { error: memosErr } = await supabase
      .from("memos")
      .select("id")
      .limit(1);
    const { error: todosErr } = await supabase
      .from("todos")
      .select("id")
      .limit(1);

    const memosOk = !memosErr || memosErr.code !== "PGRST205";
    const todosOk = !todosErr || todosErr.code !== "PGRST205";

    return NextResponse.json({ memos: memosOk, todos: todosOk });
  } catch {
    return NextResponse.json({ memos: false, todos: false });
  }
}

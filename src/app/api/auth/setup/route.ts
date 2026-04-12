import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

async function ensureUsersTable(supabase: ReturnType<typeof createServerClient>) {
  const { error: checkError } = await supabase.from("users").select("id").limit(1);
  if (checkError && checkError.message.includes("Could not find the table")) {
    const { error: rpcError } = await supabase.rpc("exec_sql", {
      query: `
        create table if not exists public.users (
          id uuid primary key default gen_random_uuid(),
          username text unique not null,
          password_hash text not null,
          display_name text not null,
          is_active boolean default true,
          created_at timestamptz default now()
        );
        alter table public.users enable row level security;
        create policy "Allow all on users" on public.users for all using (true) with check (true);
      `,
    });
    if (rpcError) {
      return rpcError.message;
    }
  }
  return null;
}

export async function POST() {
  const supabase = createServerClient();

  const tableErr = await ensureUsersTable(supabase);
  if (tableErr) {
    return NextResponse.json(
      {
        error: "users 테이블이 없습니다. Supabase SQL Editor에서 아래 SQL을 실행하세요",
        sql: `create table if not exists users (id uuid primary key default gen_random_uuid(), username text unique not null, password_hash text not null, display_name text not null, is_active boolean default true, created_at timestamptz default now()); alter table users enable row level security; create policy "Allow all on users" on users for all using (true) with check (true);`,
      },
      { status: 500 }
    );
  }

  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json({ error: "이미 계정이 존재합니다" }, { status: 400 });
  }

  const hash = await hashPassword(DEFAULT_PASSWORD);
  const { data, error } = await supabase
    .from("users")
    .insert({
      username: "admin",
      password_hash: hash,
      display_name: "관리자",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    message: "admin 계정이 생성되었습니다",
    username: "admin",
    password: DEFAULT_PASSWORD,
    user: { id: data.id, username: data.username, display_name: data.display_name },
  });
}

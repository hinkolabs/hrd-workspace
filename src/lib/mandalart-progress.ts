import type { SupabaseClient } from "@supabase/supabase-js";

/** 만다라트 외곽 8블록 × (중앙칸 제외) 8칸 = 세부실천항목 총 개수 */
export const MANDALART_DETAIL_TOTAL = 64;
/** 중앙 블록의 (중앙칸 제외) 8칸 = 세부목표 총 개수 */
export const MANDALART_SUBGOAL_TOTAL = 8;

export type MandalartProgressRow = {
  user_id: string;
  username: string;
  display_name: string;
  dept: string | null;
  has_mandalart: boolean;
  center_goal_filled: boolean;
  /** 세부목표 작성 개수 (/8) */
  subgoal_filled_count: number;
  /** 세부실천항목 작성 개수 (/64) — 요청하신 "64개 중 몇 개" 지표 */
  detail_filled_count: number;
  /** 세부실천항목 완료 체크 개수 (/64) — 달성도 지표 */
  detail_done_count: number;
  mandalart_created_at: string | null;
  mandalart_updated_at: string | null;
};

type CellRow = {
  mandalart_id: string;
  block_idx: number;
  cell_idx: number;
  text: string | null;
  done: boolean | null;
};

type MandalartRow = {
  id: string;
  user_id: string;
  center_goal: string | null;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  dept: string | null;
};

/**
 * 전체(또는 지정된) 사용자의 만다라트 작성 현황을 실시간으로 계산한다.
 * 실시간 조회 API와 스냅샷 생성 양쪽에서 공용으로 사용된다.
 */
export async function computeMandalartProgress(
  supabase: SupabaseClient,
  opts: { includeAdmins?: boolean } = {}
): Promise<MandalartProgressRow[]> {
  const { includeAdmins = false } = opts;

  let userQuery = supabase.from("users").select("id, username, display_name, dept");
  if (!includeAdmins) userQuery = userQuery.eq("role", "member");
  const { data: users, error: usersErr } = await userQuery;
  if (usersErr) throw new Error(usersErr.message);

  const userList = (users ?? []) as UserRow[];
  if (userList.length === 0) return [];

  const userIds = userList.map((u) => u.id);

  const { data: mandalarts, error: mErr } = await supabase
    .from("growth_mandalarts")
    .select("id, user_id, center_goal, created_at, updated_at")
    .in("user_id", userIds);
  if (mErr) throw new Error(mErr.message);

  const mandalartList = (mandalarts ?? []) as MandalartRow[];

  // 유저당 만다라트가 여러 개(레거시 다중 기수 등)면 가장 최근 것을 사용
  const mandalartByUser = new Map<string, MandalartRow>();
  for (const m of mandalartList) {
    const existing = mandalartByUser.get(m.user_id);
    if (!existing || new Date(m.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
      mandalartByUser.set(m.user_id, m);
    }
  }

  const mandalartIds = [...mandalartByUser.values()].map((m) => m.id);
  const cellsByMandalart = new Map<string, CellRow[]>();

  if (mandalartIds.length > 0) {
    const { data: cells, error: cErr } = await supabase
      .from("growth_mandalart_cells")
      .select("mandalart_id, block_idx, cell_idx, text, done")
      .in("mandalart_id", mandalartIds);
    if (cErr) throw new Error(cErr.message);

    for (const c of (cells ?? []) as CellRow[]) {
      const list = cellsByMandalart.get(c.mandalart_id) ?? [];
      list.push(c);
      cellsByMandalart.set(c.mandalart_id, list);
    }
  }

  return userList.map((u): MandalartProgressRow => {
    const m = mandalartByUser.get(u.id);
    if (!m) {
      return {
        user_id: u.id,
        username: u.username,
        display_name: u.display_name,
        dept: u.dept ?? null,
        has_mandalart: false,
        center_goal_filled: false,
        subgoal_filled_count: 0,
        detail_filled_count: 0,
        detail_done_count: 0,
        mandalart_created_at: null,
        mandalart_updated_at: null,
      };
    }

    const cells = cellsByMandalart.get(m.id) ?? [];
    const centerCell = cells.find((c) => c.block_idx === 4 && c.cell_idx === 4);
    const centerGoalFilled = !!(m.center_goal?.trim() || centerCell?.text?.trim());

    const subgoalCells = cells.filter((c) => c.block_idx === 4 && c.cell_idx !== 4);
    const detailCells = cells.filter((c) => c.block_idx !== 4 && c.cell_idx !== 4);

    return {
      user_id: u.id,
      username: u.username,
      display_name: u.display_name,
      dept: u.dept ?? null,
      has_mandalart: true,
      center_goal_filled: centerGoalFilled,
      subgoal_filled_count: subgoalCells.filter((c) => c.text?.trim()).length,
      detail_filled_count: detailCells.filter((c) => c.text?.trim()).length,
      detail_done_count: detailCells.filter((c) => c.done).length,
      mandalart_created_at: m.created_at,
      mandalart_updated_at: m.updated_at,
    };
  });
}

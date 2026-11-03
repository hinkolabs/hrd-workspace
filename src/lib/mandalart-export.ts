import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

/** 중앙 블록에서 좌상단부터 읽기 순 세부목표 칸. 중앙칸(4) 제외 */
const SUBGOAL_ORDER = [0, 1, 2, 3, 5, 6, 7, 8];
/** 외곽 블록에서 실천항목 칸. 중앙칸(4, 세부목표 미러) 제외 */
const DETAIL_ORDER = [0, 1, 2, 3, 5, 6, 7, 8];

const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  dept: string | null;
  role: string | null;
  last_login_at: string | null;
};

type MandalartRow = {
  id: string;
  user_id: string;
  center_goal: string | null;
  updated_at: string;
};

type CellRow = {
  id: string;
  mandalart_id: string;
  block_idx: number;
  cell_idx: number;
  text: string | null;
  emoji: string | null;
  done: boolean | null;
};

type TodoRow = {
  cell_id: string;
  text: string | null;
  done: boolean | null;
  order_idx: number | null;
};

async function fetchAllRows<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await run(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function formatKst(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace("T", " ");
}

function composeContent(
  text?: string | null,
  emoji?: string | null,
  todos?: { text: string | null; done: boolean | null }[]
): string {
  const lines: string[] = [];
  const main = [emoji?.trim(), text?.trim()].filter(Boolean).join(" ");
  if (main) lines.push(main);
  for (const t of todos ?? []) {
    const body = t.text?.trim();
    if (!body) continue;
    lines.push(`${t.done ? "☑" : "☐"} ${body}`);
  }
  return lines.join("\n");
}

function cellMapKey(blockIdx: number, cellIdx: number): string {
  return `${blockIdx}-${cellIdx}`;
}

function filenameStamp(): string {
  return formatKst(new Date().toISOString()).replace(/[: ]/g, (ch) => (ch === ":" ? "" : "_")).slice(0, 16);
}

export function mandalartExportFilename(): string {
  return `만다라트_전체내용_${filenameStamp()}.xlsx`;
}

export async function buildMandalartExportWorkbook(supabase: SupabaseClient): Promise<{
  bytes: Uint8Array;
  filename: string;
}> {
  let users: UserRow[] = [];
  {
    const withLogin = await supabase
      .from("users")
      .select("id, username, display_name, dept, role, last_login_at")
      .order("created_at", { ascending: true });

    if (withLogin.error) {
      const fallback = await supabase
        .from("users")
        .select("id, username, display_name, dept, role")
        .order("created_at", { ascending: true });
      if (fallback.error) throw new Error(fallback.error.message);
      users = (fallback.data ?? []).map((u) => ({ ...u, last_login_at: null })) as UserRow[];
    } else {
      users = (withLogin.data ?? []) as UserRow[];
    }
  }

  const { data: mandalarts, error: mErr } = await supabase
    .from("growth_mandalarts")
    .select("id, user_id, center_goal, updated_at");
  if (mErr) throw new Error(mErr.message);

  const latestByUser = new Map<string, MandalartRow>();
  for (const m of (mandalarts ?? []) as MandalartRow[]) {
    const existing = latestByUser.get(m.user_id);
    if (!existing || new Date(m.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
      latestByUser.set(m.user_id, m);
    }
  }

  const mandalartIds = [...latestByUser.values()].map((m) => m.id);
  const cells: CellRow[] = [];
  for (const chunk of chunks(mandalartIds, IN_CHUNK)) {
    if (chunk.length === 0) continue;
    const rows = await fetchAllRows<CellRow>((from, to) =>
      supabase
        .from("growth_mandalart_cells")
        .select("id, mandalart_id, block_idx, cell_idx, text, emoji, done")
        .in("mandalart_id", chunk)
        .range(from, to)
    );
    cells.push(...rows);
  }

  const cellsByMandalart = new Map<string, CellRow[]>();
  const cellIds: string[] = [];
  for (const c of cells) {
    const list = cellsByMandalart.get(c.mandalart_id) ?? [];
    list.push(c);
    cellsByMandalart.set(c.mandalart_id, list);
    if (c.id) cellIds.push(c.id);
  }

  const todos: TodoRow[] = [];
  try {
    for (const chunk of chunks(cellIds, IN_CHUNK)) {
      if (chunk.length === 0) continue;
      const rows = await fetchAllRows<TodoRow>((from, to) =>
        supabase
          .from("growth_mandalart_cell_todos")
          .select("cell_id, text, done, order_idx")
          .in("cell_id", chunk)
          .order("order_idx")
          .range(from, to)
      );
      todos.push(...rows);
    }
  } catch {
    /* todos table may not exist yet */
  }

  const todosByCell = new Map<string, TodoRow[]>();
  for (const t of todos) {
    const list = todosByCell.get(t.cell_id) ?? [];
    list.push(t);
    todosByCell.set(t.cell_id, list);
  }
  for (const list of todosByCell.values()) {
    list.sort((a, b) => (a.order_idx ?? 0) - (b.order_idx ?? 0));
  }

  const wideHeader = [
    "아이디",
    "닉네임",
    "그룹",
    "최근접속일",
    "핵심목표",
  ];
  for (let i = 0; i < SUBGOAL_ORDER.length; i++) {
    wideHeader.push(`세부목표${i + 1}`);
    for (let j = 0; j < DETAIL_ORDER.length; j++) {
      wideHeader.push(`세부목표${i + 1}_실천${j + 1}`);
    }
  }

  const wideBody: string[][] = [];
  const detailRows: string[][] = [
    ["아이디", "닉네임", "그룹", "최근접속일", "구분", "세부목표", "칸", "내용", "완료"],
  ];

  function contentOf(cell: CellRow | undefined): string {
    if (!cell) return "";
    return composeContent(cell.text, cell.emoji, todosByCell.get(cell.id) ?? []);
  }

  for (const u of users) {
    const lastAccess = formatKst(u.last_login_at);
    const m = latestByUser.get(u.id);
    const cellList = m ? (cellsByMandalart.get(m.id) ?? []) : [];
    const byKey = new Map(cellList.map((c) => [cellMapKey(c.block_idx, c.cell_idx), c]));

    const lookup = (blockIdx: number, cellIdx: number) => byKey.get(cellMapKey(blockIdx, cellIdx));

    const centerCell = lookup(4, 4);
    const centerGoal = (m?.center_goal ?? "").trim() || (centerCell?.text ?? "").trim();
    const centerContent = composeContent(
      centerGoal || centerCell?.text,
      centerCell?.emoji,
      centerCell ? todosByCell.get(centerCell.id) ?? [] : []
    );

    const row: string[] = [
      u.username,
      u.display_name,
      u.dept ?? "",
      lastAccess,
      centerContent,
    ];

    if (centerContent) {
      detailRows.push([
        u.username,
        u.display_name,
        u.dept ?? "",
        lastAccess,
        "핵심목표",
        "",
        "",
        centerContent,
        centerCell?.done ? "Y" : "",
      ]);
    }

    for (let i = 0; i < SUBGOAL_ORDER.length; i++) {
      const subCellIdx = SUBGOAL_ORDER[i];
      const subCell = lookup(4, subCellIdx);
      const subContent = contentOf(subCell);
      const subLabel = (subCell?.text ?? "").trim() || `세부목표${i + 1}`;
      row.push(subContent);

      if (subContent) {
        detailRows.push([
          u.username,
          u.display_name,
          u.dept ?? "",
          lastAccess,
          "세부목표",
          `세부목표${i + 1}`,
          "",
          subContent,
          subCell?.done ? "Y" : "",
        ]);
      }

      const outerBlock = subCellIdx;
      for (let j = 0; j < DETAIL_ORDER.length; j++) {
        const detailCell = lookup(outerBlock, DETAIL_ORDER[j]);
        const detailContent = contentOf(detailCell);
        row.push(detailContent);
        if (detailContent) {
          detailRows.push([
            u.username,
            u.display_name,
            u.dept ?? "",
            lastAccess,
            "실천항목",
            subLabel,
            `실천${j + 1}`,
            detailContent,
            detailCell?.done ? "Y" : "",
          ]);
        }
      }
    }

    if (!m) {
      detailRows.push([
        u.username,
        u.display_name,
        u.dept ?? "",
        lastAccess,
        "미작성",
        "",
        "",
        "",
        "",
      ]);
    }

    wideBody.push(row);
  }

  const wideAoa = [wideHeader, ...wideBody];
  const wideWs = XLSX.utils.aoa_to_sheet(wideAoa);
  wideWs["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    ...Array.from({ length: wideHeader.length - 5 }, () => ({ wch: 18 })),
  ];
  wideWs["!freeze"] = { xSplit: 2, ySplit: 1 };

  const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
  detailWs["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 10 },
    { wch: 40 },
    { wch: 8 },
  ];
  detailWs["!freeze"] = { xSplit: 2, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wideWs, "사용자별 전체내용");
  XLSX.utils.book_append_sheet(wb, detailWs, "셀 상세");

  const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  return { bytes: new Uint8Array(bytes), filename: mandalartExportFilename() };
}

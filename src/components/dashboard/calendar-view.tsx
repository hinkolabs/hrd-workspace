"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Todo, Memo } from "@/lib/supabase";

type ViewMode = "monthly" | "weekly";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalEvent = {
  id: string;
  title: string;
  type: "todo" | "memo";
  priority?: Todo["priority"];
  status?: Todo["status"];
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEventsForDay(day: Date, todos: Todo[], memos: Memo[]): CalEvent[] {
  const events: CalEvent[] = [];
  for (const todo of todos) {
    if (todo.due_date && isSameDay(new Date(todo.due_date), day)) {
      events.push({ id: todo.id, title: todo.title, type: "todo", priority: todo.priority, status: todo.status });
    }
  }
  for (const memo of memos) {
    if (isSameDay(new Date(memo.created_at), day)) {
      events.push({ id: memo.id, title: memo.title, type: "memo" });
    }
  }
  return events;
}

function eventClass(event: CalEvent) {
  const done = event.status === "done";
  if (event.type === "memo") return `bg-indigo-100 text-indigo-700 ${done ? "opacity-50" : ""}`;
  if (event.priority === "high") return `bg-red-100 text-red-700 ${done ? "opacity-50 line-through" : ""}`;
  if (event.priority === "medium") return `bg-amber-100 text-amber-700 ${done ? "opacity-50 line-through" : ""}`;
  return `bg-gray-100 text-gray-600 ${done ? "opacity-50 line-through" : ""}`;
}

/* ── 상세 모달 ── */
function EventModal({ item, type, onClose }: { item: Todo | Memo; type: "todo" | "memo"; onClose: () => void }) {
  const priorityMap: Record<string, { label: string; cls: string }> = {
    high:   { label: "긴급", cls: "bg-red-100 text-red-700" },
    medium: { label: "보통", cls: "bg-amber-100 text-amber-700" },
    low:    { label: "낮음", cls: "bg-gray-100 text-gray-600" },
  };
  const statusMap: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:     { label: "대기중",   cls: "bg-gray-100 text-gray-600",   icon: <Clock size={12} /> },
    in_progress: { label: "진행중",   cls: "bg-blue-100 text-blue-700",   icon: <AlertCircle size={12} /> },
    done:        { label: "완료",     cls: "bg-green-100 text-green-700", icon: <CheckCircle2 size={12} /> },
  };

  const isTodo = type === "todo";
  const todo = isTodo ? (item as Todo) : null;
  const memo = !isTodo ? (item as Memo) : null;

  const memoColorMap: Record<string, string> = {
    red:    "bg-red-400",
    orange: "bg-orange-400",
    yellow: "bg-yellow-400",
    green:  "bg-green-400",
    blue:   "bg-blue-400",
    purple: "bg-purple-400",
    pink:   "bg-pink-400",
    default:"bg-gray-400",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`px-5 py-4 flex items-start justify-between ${isTodo ? "bg-gradient-to-r from-indigo-50 to-purple-50" : "bg-gradient-to-r from-sky-50 to-indigo-50"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 p-1.5 rounded-lg ${isTodo ? "bg-indigo-100 text-indigo-600" : "bg-sky-100 text-sky-600"}`}>
              {isTodo ? <Calendar size={14} /> : <FileText size={14} />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-gray-400 mb-0.5">{isTodo ? "할 일" : "메모"}</p>
              <h3 className="text-sm font-bold text-gray-900 leading-tight break-words">{item.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 ml-2 p-1 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-3">
          {isTodo && todo && (
            <>
              {/* 상태 + 우선순위 */}
              <div className="flex items-center gap-2">
                {todo.status && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusMap[todo.status]?.cls}`}>
                    {statusMap[todo.status]?.icon}
                    {statusMap[todo.status]?.label}
                  </span>
                )}
                {todo.priority && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${priorityMap[todo.priority]?.cls}`}>
                    {priorityMap[todo.priority]?.label}
                  </span>
                )}
              </div>

              {/* 마감일 */}
              {todo.due_date && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} className="text-gray-400" />
                  <span>마감일: <span className="font-medium text-gray-700">{new Date(todo.due_date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span></span>
                </div>
              )}

              {/* 설명 */}
              {todo.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">설명</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{todo.description}</p>
                </div>
              )}

              {/* 등록일 */}
              <p className="text-[10px] text-gray-300">
                등록: {new Date(todo.created_at).toLocaleDateString("ko-KR")}
              </p>
            </>
          )}

          {!isTodo && memo && (
            <>
              {/* 색상 표시 */}
              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${memoColorMap[memo.color] ?? memoColorMap.default}`} />
                <span className="text-[11px] text-gray-400">메모</span>
              </div>

              {/* 내용 */}
              {memo.content ? (
                <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">내용 없음</p>
              )}

              {/* 등록일 */}
              <p className="text-[10px] text-gray-300">
                등록: {new Date(memo.created_at).toLocaleDateString("ko-KR")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 월별 캘린더 ── */
function MonthlyCalendar({
  currentDate, todos, memos, onEventClick,
}: {
  currentDate: Date; todos: Todo[]; memos: Memo[];
  onEventClick: (event: CalEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 mb-1 shrink-0">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px flex-1 min-h-0 overflow-y-auto">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="bg-gray-50/40 rounded-lg" />;

          const events = getEventsForDay(day, todos, memos);
          const isToday = isSameDay(day, today);
          const isSun = day.getDay() === 0;
          const isSat = day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              className={`rounded-lg p-1 min-h-[52px] flex flex-col ${
                isToday
                  ? "bg-indigo-50 ring-1 ring-indigo-300"
                  : "bg-white border border-gray-100 hover:bg-gray-50 transition-colors"
              }`}
            >
              <span
                className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                  isToday
                    ? "bg-indigo-600 text-white"
                    : isSun
                    ? "text-red-500"
                    : isSat
                    ? "text-blue-500"
                    : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </span>

              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {events.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-95 transition-all ${eventClass(ev)}`}
                    title={ev.title}
                    onClick={() => onEventClick(ev)}
                  >
                    {ev.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div
                    className="text-[10px] text-gray-400 pl-1 cursor-pointer hover:text-gray-600"
                    onClick={() => onEventClick(events[2])}
                  >
                    +{events.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 주별 캘린더 ── */
function WeeklyCalendar({
  currentDate, todos, memos, onEventClick,
}: {
  currentDate: Date; todos: Todo[]; memos: Memo[];
  onEventClick: (event: CalEvent) => void;
}) {
  const today = new Date();

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-1 min-h-0 gap-1 overflow-hidden">
      {days.map((day, i) => {
        const events = getEventsForDay(day, todos, memos);
        const isToday = isSameDay(day, today);
        const isSun = i === 0;
        const isSat = i === 6;

        return (
          <div
            key={day.toISOString()}
            className={`flex flex-col flex-1 rounded-xl p-2 min-w-0 ${
              isToday ? "bg-indigo-50 ring-1 ring-indigo-300" : "bg-gray-50"
            }`}
          >
            <div className="text-center shrink-0 mb-1.5">
              <div
                className={`text-[10px] font-semibold ${
                  isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-gray-400"
                }`}
              >
                {WEEKDAYS[i]}
              </div>
              <div
                className={`text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                  isToday ? "bg-indigo-600 text-white" : "text-gray-800"
                }`}
              >
                {day.getDate()}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {events.length === 0 ? (
                <div className="text-[10px] text-gray-300 text-center pt-1">—</div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[10px] leading-snug px-1.5 py-1 rounded-lg truncate cursor-pointer hover:brightness-95 transition-all ${eventClass(ev)}`}
                    title={ev.title}
                    onClick={() => onEventClick(ev)}
                  >
                    {ev.title}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 범례 ── */
function Legend() {
  return (
    <div className="flex items-center gap-3 mt-2 shrink-0">
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />긴급
      </span>
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />보통
      </span>
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />낮음
      </span>
      <span className="flex items-center gap-1 text-[10px] text-gray-400">
        <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />메모
      </span>
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
export default function CalendarView() {
  const [view, setView] = useState<ViewMode>("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<{ item: Todo | Memo; type: "todo" | "memo" } | null>(null);

  const fetchData = useCallback(async () => {
    const [tRes, mRes] = await Promise.all([fetch("/api/todos"), fetch("/api/memos")]);
    if (tRes.ok) setTodos(await tRes.json());
    if (mRes.ok) setMemos(await mRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    const channel = supabase
      .channel("calendar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "memos" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  function handleEventClick(event: CalEvent) {
    if (event.type === "todo") {
      const todo = todos.find((t) => t.id === event.id);
      if (todo) setSelectedEvent({ item: todo, type: "todo" });
    } else {
      const memo = memos.find((m) => m.id === event.id);
      if (memo) setSelectedEvent({ item: memo, type: "memo" });
    }
  }

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "monthly") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  }

  function periodLabel() {
    if (view === "monthly") {
      return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
    }
    const sun = new Date(currentDate);
    sun.setDate(currentDate.getDate() - currentDate.getDay());
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    const sm = sun.getMonth() + 1, em = sat.getMonth() + 1;
    if (sm === em) return `${sun.getFullYear()}년 ${sm}월 ${sun.getDate()}–${sat.getDate()}일`;
    return `${sm}월 ${sun.getDate()}일 – ${em}월 ${sat.getDate()}일`;
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">일정 캘린더</h2>
            <p className="text-xs text-gray-500 mt-0.5">메모 · 할일 일정 한눈에 보기</p>
          </div>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="monthly">월별</option>
            <option value="weekly">주별</option>
          </select>
        </div>

        {/* 내비게이션 */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-700">{periodLabel()}</span>
          <button
            onClick={() => navigate(1)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* 캘린더 본체 */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "monthly" ? (
          <MonthlyCalendar currentDate={currentDate} todos={todos} memos={memos} onEventClick={handleEventClick} />
        ) : (
          <WeeklyCalendar currentDate={currentDate} todos={todos} memos={memos} onEventClick={handleEventClick} />
        )}

        {/* 범례 */}
        {!loading && <Legend />}
      </div>

      {/* 상세 모달 */}
      {selectedEvent && (
        <EventModal
          item={selectedEvent.item}
          type={selectedEvent.type}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}

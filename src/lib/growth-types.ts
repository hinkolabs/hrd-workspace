// Growth Community shared types

export type GrowthCohort = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "archived";
  created_at: string;
};

export type GrowthMember = {
  id: string;
  cohort_id: string;
  user_id: string;
  role: "trainee" | "mentor" | "admin";
  dept: string | null;
  // joined from users
  display_name?: string;
  username?: string;
};

export type GrowthMandalart = {
  id: string;
  user_id: string;
  cohort_id: string;
  center_goal: string | null;
  subgoal_order?: number[] | null;
  visibility: "private" | "cohort";
  created_at: string;
  updated_at: string;
  // joined
  display_name?: string;
  dept?: string | null;
  cells?: GrowthMandalartCell[];
};

export type CycleType = "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "weekday";

export type GrowthMandalartCellTodo = {
  id: string;
  cell_id: string;
  text: string;
  done: boolean;
  order_idx: number;
  cycle_type: CycleType;
  cycle_weekdays: number[] | null;
  cycle_count: number;
  /** 체크 이력 — `${periodKey}__${repIndex}` 형식. 반복 진행률 계산에 사용 */
  checked_periods?: string[];
};

export type GrowthMandalartCell = {
  id: string;
  mandalart_id: string;
  block_idx: number;
  cell_idx: number;
  text: string;
  emoji: string;
  done: boolean;
  // 직접입력(테마 미선택) 셀 전용 — 셀 자체가 하나의 실행 항목으로서 갖는 반복 설정
  cycle_type?: CycleType;
  cycle_weekdays?: number[] | null;
  cycle_count?: number;
  /** 체크 이력 — `${periodKey}__${repIndex}` 형식. 반복 진행률 계산에 사용 */
  checked_periods?: string[];
  todos?: GrowthMandalartCellTodo[];
  progress?: { done: number; total: number };
};

export type GrowthJournal = {
  id: string;
  user_id: string;
  cohort_id: string;
  title: string;
  content: string | null;
  mood: string | null;
  images: string[];
  week_of: string | null;
  visibility: "private" | "cohort";
  created_at: string;
  updated_at: string;
  // joined
  display_name?: string;
  comment_count?: number;
  reactions?: GrowthReactionSummary[];
};

export type GrowthComment = {
  id: string;
  journal_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  display_name?: string;
  replies?: GrowthComment[];
};

export type GrowthReaction = {
  id: string;
  target_type: "journal" | "comment";
  target_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type GrowthReactionSummary = {
  emoji: string;
  count: number;
  reacted: boolean; // whether current user reacted
};

export type GrowthMentorThread = {
  id: string;
  trainee_id: string;
  mentor_id: string | null;
  cohort_id: string;
  title: string;
  status: "active" | "closed";
  created_at: string;
  // joined
  trainee_name?: string;
  mentor_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
};

export type GrowthMentorMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  attachments: string[];
  created_at: string;
  sender_name?: string;
};

export type GrowthRetro = {
  id: string;
  user_id: string;
  cohort_id: string;
  month: string; // yyyy-mm
  achievements: string | null;
  learnings: string | null;
  next_goals: string | null;
  mentor_feedback: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string;
};

// ── Theme Achievement ───────────────────────────────────────────────────────

export type GrowthThemeCategory = {
  id: string;
  cohort_id: string;
  name: string;
  description: string | null;
  icon_emoji: string;
  order_idx: number;
  created_at: string;
};

export type GrowthThemeItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  order_idx: number;
  is_required: boolean;
  created_at: string;
};

export type GrowthThemeCompletion = {
  id: string;
  item_id: string;
  user_id: string;
  completed_at: string;
};

export type GrowthThemeItemWithStats = GrowthThemeItem & {
  completed_count: number;
  total_members: number;
  is_completed_by_me: boolean;
};

export type GrowthThemeCategoryWithItems = GrowthThemeCategory & {
  items: GrowthThemeItemWithStats[];
  my_completion_count: number;
  total_members?: number;
};

export type GrowthThemeRankEntry = {
  user_id: string;
  display_name: string;
  dept: string | null;
  completion_count: number;
  total_items: number;
  completed_items: string[]; // item ids
};

export const MOODS = [
  { emoji: "🔥", label: "불태우는 중" },
  { emoji: "💪", label: "성장하는 중" },
  { emoji: "😊", label: "좋은 하루" },
  { emoji: "😐", label: "평범한 하루" },
  { emoji: "😔", label: "힘든 하루" },
];

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "🎉", "💪", "😊"];

// ── 채팅 모집 → 신청 (Recruit) ───────────────────────────────────────────────

export type RecruitStatus = "open" | "pending" | "approved" | "rejected";

export type GrowthRecruit = {
  id: string;
  message_id: string;
  room_id: string | null;
  organizer_id: string;
  title: string;
  description: string | null;
  target_count: number | null;
  status: RecruitStatus;
  created_at: string;
  updated_at: string;
  // joined
  participants?: { user_id: string; display_name: string }[];
};

export type RecruitFieldType = "text" | "textarea" | "date" | "date_range" | "number" | "select";

export type GrowthRecruitFormField = {
  id: string;
  label: string;
  field_type: RecruitFieldType;
  options: string[] | null;
  required: boolean;
  order_idx: number;
  created_at: string;
};

export type RecruitApplicationStatus = "pending" | "approved" | "rejected";

export type GrowthRecruitApplication = {
  id: string;
  recruit_id: string;
  submitted_by: string;
  answers: Record<string, string>;
  participants: { user_id: string; display_name: string }[];
  status: RecruitApplicationStatus;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  recruit?: GrowthRecruit;
  submitted_by_name?: string;
};

// ── 그룹(승인된 모집) + 밴드형 게시판 ─────────────────────────────────────────

export type GrowthGroup = {
  id: string;
  application_id: string | null;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  member_count?: number;
  my_role?: "leader" | "member";
};

export type GrowthGroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: "leader" | "member";
  joined_at: string;
  display_name?: string;
};

export type GrowthGroupPost = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  images: string[];
  created_at: string;
  updated_at: string;
  // joined
  display_name?: string;
  comments?: GrowthGroupComment[];
  comment_count?: number;
};

export type GrowthGroupComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
};

// ── 건의사항 ────────────────────────────────────────────────────────────────

export type GrowthSuggestionStatus = "open" | "resolved";

export type GrowthSuggestion = {
  id: string;
  user_id: string | null;
  sender_name: string;
  content: string;
  status: GrowthSuggestionStatus;
  admin_reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  replied_by_name?: string | null;
};

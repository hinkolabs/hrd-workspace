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
  visibility: "private" | "cohort";
  created_at: string;
  updated_at: string;
  // joined
  display_name?: string;
  cells?: GrowthMandalartCell[];
};

export type GrowthMandalartCell = {
  id: string;
  mandalart_id: string;
  block_idx: number;
  cell_idx: number;
  text: string;
  emoji: string;
  done: boolean;
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

export const MOODS = [
  { emoji: "🔥", label: "불태우는 중" },
  { emoji: "💪", label: "성장하는 중" },
  { emoji: "😊", label: "좋은 하루" },
  { emoji: "😐", label: "평범한 하루" },
  { emoji: "😔", label: "힘든 하루" },
];

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "🎉", "💪", "😊"];

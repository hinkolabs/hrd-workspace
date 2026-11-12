import { createServerClient } from "@/lib/supabase-server";

export async function broadcastQuiz(code: string | null) {
  if (!code) return;
  try {
    const supabase = createServerClient();
    const channel = supabase.channel(`quiz:${code}`);
    await channel.httpSend("state", { at: Date.now() });
    await supabase.removeChannel(channel);
  } catch {
    /* 폴링이 같은 상태를 다시 맞춘다 */
  }
}

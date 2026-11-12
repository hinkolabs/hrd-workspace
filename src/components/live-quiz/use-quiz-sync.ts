"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

type Track = { participantId: string; teamId: string } | null;

/** 행사 채널에는 새로고침 신호만 오고, 문제 내용은 서버에서 다시 받는다. */
export function useQuizRealtime(code: string, onSignal: () => void, track: Track = null, onOnline?: (count: number) => void) {
  const signalRef = useRef(onSignal);
  const onlineRef = useRef(onOnline);
  const trackRef = useRef(track);

  useEffect(() => {
    signalRef.current = onSignal;
    onlineRef.current = onOnline;
    trackRef.current = track;
  });

  const trackKey = track ? `${track.participantId}:${track.teamId}` : "";

  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    const channel = supabase.channel(`quiz:${code}`, { config: { broadcast: { self: true } } });
    channel.on("broadcast", { event: "state" }, () => signalRef.current());
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ participantId?: string }>();
      const ids = new Set<string>();
      for (const metas of Object.values(state)) {
        for (const meta of metas) if (meta.participantId) ids.add(meta.participantId);
      }
      onlineRef.current?.(ids.size);
    });
    channel.subscribe((status) => {
      const identity = trackRef.current;
      if (status === "SUBSCRIBED" && identity) void channel.track(identity);
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, trackKey]);
}

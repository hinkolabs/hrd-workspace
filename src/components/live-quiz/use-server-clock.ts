"use client";

import { useEffect, useRef, useState } from "react";

/** 서버 시각과 맞춘 현재 시각(ms). 답변 제한 시간을 휴대폰 시계에 맡기지 않기 위해 쓴다. */
export function useServerClock(serverNow: string | null) {
  const [now, setNow] = useState(() => Date.now());
  const skew = useRef(0);

  useEffect(() => {
    if (!serverNow) return;
    const server = new Date(serverNow).getTime();
    if (!Number.isNaN(server)) skew.current = Date.now() - server;
  }, [serverNow]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  return now - skew.current;
}

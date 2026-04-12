"use client";

import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";

type Props = {
  html: string;
};

export default function PreviewPanel({ html }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Monitor size={32} className="mb-2 opacity-50" />
        <p className="text-sm">미리보기가 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin allow-scripts"
      className="w-full h-full border-0"
      title="UI 미리보기"
    />
  );
}

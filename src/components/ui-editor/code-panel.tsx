"use client";

import dynamic from "next/dynamic";
import { Code2 } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Props = {
  code: string;
  onChange: (value: string) => void;
};

export default function CodePanel({ code, onChange }: Props) {
  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Code2 size={28} className="mb-2 opacity-50" />
        <p className="text-sm">컴포넌트 코드가 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      value={code}
      onChange={(v) => onChange(v ?? "")}
      theme="vs"
      options={{
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: "on",
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}

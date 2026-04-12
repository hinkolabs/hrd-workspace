"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Save, FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type SettingData = {
  key: string;
  value: string;
  file_name: string | null;
  updated_at: string | null;
};

const MAX_CHARS = 50000;

export default function SettingsPage() {
  const [data, setData] = useState<SettingData | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const d: SettingData = await res.json();
        setData(d);
        setText(d.value || "");
        setUploadedFileName(d.file_name);
      }
    } catch {
      setStatus({ type: "error", message: "설정을 불러오는 데 실패했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveText() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: text, file_name: uploadedFileName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "저장 실패");
      }
      const d: SettingData = await res.json();
      setData(d);
      setText(d.value || "");
      setStatus({ type: "success", message: "설정이 저장되었습니다." });
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("text", "");
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "파일 업로드 실패");
      }
      const d: SettingData = await res.json();
      setData(d);
      setText(d.value || "");
      setUploadedFileName(d.file_name);
      setStatus({ type: "success", message: `"${file.name}" 파일에서 텍스트를 추출하여 저장했습니다.` });
    } catch (e) {
      setStatus({ type: "error", message: e instanceof Error ? e.message : "파일 업로드 실패" });
    } finally {
      setUploadingFile(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleClearText() {
    setText("");
    setUploadedFileName(null);
    setStatus(null);
  }

  const charCount = text.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          인재개발실 기준 정보를 등록합니다. 이 데이터는 견적 분석 시 AI의 참고 기준으로 활용됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* 상태 메시지 */}
        {status && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              status.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            {status.message}
          </div>
        )}

        {/* 파일 업로드 영역 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">파일 업로드</h2>
          <p className="text-xs text-gray-500 mb-4">
            PDF, HWP, DOCX, TXT 파일을 업로드하면 텍스트를 자동 추출하여 아래 텍스트 영역에 채워넣습니다.
          </p>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${uploadingFile ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <p className="text-sm text-gray-500">파일 처리 중...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} className="text-gray-400" />
                <p className="text-sm text-gray-600">
                  파일을 드래그하거나 <span className="text-indigo-600 font-medium">클릭하여 선택</span>
                </p>
                <p className="text-xs text-gray-400">PDF, HWP, DOCX, TXT</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.hwp,.hwpx,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileInputChange}
          />
          {uploadedFileName && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <FileText size={13} />
              <span>마지막 업로드: <span className="font-medium text-gray-700">{uploadedFileName}</span></span>
            </div>
          )}
        </div>

        {/* 텍스트 직접 입력 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900">인재개발실 기준 정보</h2>
            {text && (
              <button
                onClick={handleClearText}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
                지우기
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            교육 기준 단가, 금지 항목, 계약 조건 등 견적 검토 시 참고할 내용을 입력하세요.
            파일 업로드 후 내용을 직접 수정할 수 있습니다.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="예시:&#10;- 1인당 교육비 상한: 50만원&#10;- 강사료 기준: 시간당 15만원 이내&#10;- 외부 교육 시 식비 제외&#10;- 숙박비: 1박 10만원 이내 (서울 기준)&#10;- 부대비용 비율: 직접비의 10% 이내"
            rows={16}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:border-indigo-400 focus:outline-none bg-gray-50 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    charPercent > 90 ? "bg-red-400" : charPercent > 70 ? "bg-yellow-400" : "bg-indigo-400"
                  }`}
                  style={{ width: `${charPercent}%` }}
                />
              </div>
              <span className={`text-xs tabular-nums ${charCount > MAX_CHARS * 0.9 ? "text-red-500" : "text-gray-400"}`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
              </span>
            </div>
            <button
              onClick={handleSaveText}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>

        {/* 현재 저장 정보 */}
        {data?.updated_at && (
          <p className="text-xs text-gray-400 text-right">
            마지막 저장: {new Date(data.updated_at).toLocaleString("ko-KR")}
          </p>
        )}
      </div>
    </div>
  );
}

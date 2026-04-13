import MemoBoard from "@/components/dashboard/memo-board";
import RightPanel from "@/components/dashboard/right-panel";

export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">인재개발실 작업실</p>
      </div>

      <div className="flex-1 overflow-auto lg:overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:min-h-0">
        {/* 왼쪽: 메모 보드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col min-h-[300px] lg:min-h-0 lg:overflow-hidden">
          <MemoBoard />
        </div>

        {/* 오른쪽: 할일 + 캘린더 (리사이즈 가능) */}
        <div className="flex flex-col min-h-[680px] lg:min-h-0 lg:overflow-hidden">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

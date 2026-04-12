"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { GripHorizontal } from "lucide-react";
import TodoBoard from "./todo-board";
import CalendarView from "./calendar-view";

export default function RightPanel() {
  return (
    <Group orientation="vertical" id="dashboard-right">
      <Panel defaultSize={38} minSize={20} className="flex flex-col">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col h-full overflow-hidden">
          <TodoBoard />
        </div>
      </Panel>

      <Separator className="group flex items-center justify-center h-4 shrink-0 cursor-row-resize">
        <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-gray-100 group-hover:bg-indigo-100 group-active:bg-indigo-200 transition-colors">
          <GripHorizontal size={14} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </Separator>

      <Panel defaultSize={62} minSize={20} className="flex flex-col">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col h-full overflow-hidden">
          <CalendarView />
        </div>
      </Panel>
    </Group>
  );
}

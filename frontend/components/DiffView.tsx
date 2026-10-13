"use client";

import { useMemo } from "react";
import { diffStats, lineDiff, resumeToText } from "@/lib/diff";
import type { CustomizedResume } from "@/lib/types";

interface DiffViewProps {
  originalText: string;
  resume: CustomizedResume;
}

export default function DiffView({ originalText, resume }: DiffViewProps) {
  const lines = useMemo(
    () => lineDiff(originalText, resumeToText(resume)),
    [originalText, resume],
  );
  const stats = useMemo(() => diffStats(lines), [lines]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-3 text-xs font-medium sm:px-5">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          {stats.added} added
        </span>
        <span className="flex items-center gap-1.5 text-rose-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          {stats.removed} removed
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
          {stats.unchanged} unchanged
        </span>
      </div>

      <div className="max-h-[620px] w-full overflow-auto bg-white font-mono text-[11.5px] leading-relaxed sm:text-[12.5px]">
        {lines.map((line, index) => {
          const styles =
            line.type === "add"
              ? "bg-emerald-50 text-emerald-900"
              : line.type === "remove"
                ? "bg-rose-50 text-rose-900"
                : "text-slate-600";
          const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
          return (
            <div key={index} className={`flex gap-3 whitespace-pre-wrap px-5 py-0.5 ${styles}`}>
              <span className="select-none text-slate-400">{prefix}</span>
              <span className="min-w-0 flex-1">{line.value || "\u00A0"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Lightbulb, ListChecks } from "lucide-react";
import type { CustomizedResume } from "@/lib/types";

export default function InsightsPanel({ resume }: { resume: CustomizedResume }) {
  const matched = (resume.keywords ?? []).filter((item) => item.status === "matched");
  const missing = (resume.keywords ?? []).filter((item) => item.status === "missing");

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {resume.match_analysis && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Lightbulb className="h-4 w-4 text-brand-600" />
            Match Analysis
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {resume.match_analysis}
          </p>
        </section>
      )}

      {resume.change_notes?.length > 0 && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ListChecks className="h-4 w-4 text-brand-600" />
            What changed
          </h4>
          <ul className="mt-2 space-y-1.5">
            {resume.change_notes.map((note, index) => (
              <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {matched.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Matched keywords ({matched.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {matched.slice(0, 40).map((item, index) => (
              <span key={`${item.keyword}-${index}`} className="chip-matched">
                {item.keyword}
              </span>
            ))}
          </div>
        </section>
      )}

      {(resume.missing_keywords?.length > 0 || missing.length > 0) && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Missing keywords to consider
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(missing.length ? missing.map((item) => item.keyword) : resume.missing_keywords).map(
              (keyword, index) => (
                <span key={`${keyword}-${index}`} className="chip-missing">
                  {keyword}
                </span>
              ),
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Only add these if they genuinely reflect your experience. Never claim skills you don&apos;t have.
          </p>
        </section>
      )}
    </div>
  );
}

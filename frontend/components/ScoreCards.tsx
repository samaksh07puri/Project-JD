"use client";

import ScoreGauge from "./ScoreGauge";
import { scoreColor } from "@/lib/format";
import type { ScoreBreakdown } from "@/lib/types";

interface ScoreCardsProps {
  matchScore: number;
  atsScore: number;
  scores: ScoreBreakdown;
}

const BREAKDOWN: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "keyword_coverage", label: "Keyword coverage" },
  { key: "skills_alignment", label: "Skills alignment" },
  { key: "experience_relevance", label: "Experience relevance" },
  { key: "formatting_ats", label: "Formatting / ATS" },
];

function barColor(value: number): string {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-rose-500";
}

export default function ScoreCards({ matchScore, atsScore, scores }: ScoreCardsProps) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="grid gap-6 sm:grid-cols-2">
        <ScoreGauge value={matchScore} label="Match Score" sublabel="Resume vs. job fit" />
        <ScoreGauge value={atsScore} label="ATS Score" sublabel="Applicant tracking readiness" />
      </div>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
        {BREAKDOWN.map((item) => {
          const value = Math.max(0, Math.min(100, Math.round(scores?.[item.key] as number) || 0));
          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{item.label}</span>
                <span className={`font-semibold ${scoreColor(value)}`}>{value}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barColor(value)}`}
                  style={{ width: `${value}%`, transition: "width 0.8s ease" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {scores?.explanation && (
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {scores.explanation}
        </p>
      )}
    </div>
  );
}

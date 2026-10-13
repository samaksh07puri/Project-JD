"use client";

import Link from "next/link";
import { Clock, History } from "lucide-react";
import clsx from "clsx";
import { formatRelativeTime, scoreColor, truncate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/types";

const RECENT_COUNT = 3;

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

export default function HistoryPanel({ entries, onRestore }: HistoryPanelProps) {
  const recent = entries.slice(0, RECENT_COUNT);

  return (
    <section id="history" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
        <History className="h-5 w-5 text-brand-600" />
        Saved versions
      </h2>

      {recent.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
          Customized resumes you generate are saved here for quick comparison.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onRestore(entry)}
                className={clsx(
                  "card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift",
                  index === 2 && "hidden lg:block",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{entry.fileName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${scoreColor(entry.score)}`}>{entry.score}%</span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {truncate(entry.jdPreview, 140)}
                </p>
              </button>
            ))}
          </div>

          {entries.length > 3 ? (
            <div className="mt-6 flex justify-center">
              <Link
                href="/history"
                className="text-sm font-semibold text-brand-700 hover:text-brand-900 hover:underline"
              >
                View all
              </Link>
            </div>
          ) : entries.length > 2 ? (
            <div className="mt-6 flex justify-center lg:hidden">
              <Link
                href="/history"
                className="text-sm font-semibold text-brand-700 hover:text-brand-900 hover:underline"
              >
                View all
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

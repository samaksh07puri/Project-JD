"use client";

import { useState } from "react";
import { CalendarClock, FileText, RefreshCw, Sparkles, X } from "lucide-react";
import ResultPanel from "./ResultPanel";
import Spinner from "./Spinner";
import { ApiError, customizeResumeText, saveHistory } from "@/lib/api";
import { formatDateTime, scoreColor } from "@/lib/format";
import { toClientEntry } from "@/lib/history";
import type { CustomizableSection, HistoryEntry } from "@/lib/types";

interface HistoryModalProps {
  entry: HistoryEntry;
  token: string;
  onClose: () => void;
  /** Called with the freshly generated entry so the caller can add it to the list. */
  onSaved: (entry: HistoryEntry) => void;
  /** Open a different (e.g. the updated) entry in the modal. */
  onOpenEntry: (entry: HistoryEntry) => void;
}

const DEFAULT_SECTIONS: CustomizableSection[] = ["summary", "skills", "experience"];

export default function HistoryModal({
  entry,
  token,
  onClose,
  onSaved,
  onOpenEntry,
}: HistoryModalProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<HistoryEntry | null>(null);

  const resume = entry.response.customized;
  const ats = resume.ats_score;

  async function regenerate() {
    setRegenerating(true);
    setError("");
    try {
      const sections = (entry.response.sections_customized as CustomizableSection[])
        ?.length
        ? (entry.response.sections_customized as CustomizableSection[])
        : DEFAULT_SECTIONS;

      const response = await customizeResumeText({
        jobDescription: entry.jdPreview,
        resumeText: entry.response.original_text,
        sections,
        includeCoverLetter: true,
        tone: "professional",
      });

      const saved = await saveHistory(token, {
        file_name: entry.fileName,
        score: response.customized.match_score,
        jd_preview: entry.jdPreview,
        provider: response.provider,
        model: response.model,
        response,
      });

      const clientEntry = toClientEntry(saved);
      setUpdated(clientEntry);
      onSaved(clientEntry);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Regeneration failed. Please try again.",
      );
    } finally {
      setRegenerating(false);
    }
  }

  const headerActions = (
    <button
      type="button"
      onClick={updated ? () => onOpenEntry(updated) : regenerate}
      disabled={regenerating}
      title={
        updated
          ? "Open the newly saved version"
          : "Regenerate resume & cover letter and save a new version"
      }
      className="btn-secondary btn-sm justify-center"
    >
      {updated ? (
        <>
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">View updated version</span>
        </>
      ) : regenerating ? (
        <>
          <Spinner className="h-4 w-4" />
          <span className="hidden sm:inline">Regenerating...</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Regenerate</span>
        </>
      )}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-6 lg:py-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="fixed right-4 top-4 z-10 rounded-full border border-white/40 bg-white/20 p-2 text-slate-700 backdrop-blur-md transition-colors hover:bg-white/40 hover:text-slate-900 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="mx-auto w-full max-w-4xl lg:max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-rows-1 lg:h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Summary card (left column on desktop) */}
          <div className="card order-1 min-w-0 p-4 sm:p-5 lg:flex lg:h-1/2 lg:flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 shrink-0 text-brand-600" />
                  {entry.fileName}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-slate-500">ATS score</p>
                <p className={`text-xl font-bold ${scoreColor(ats)}`}>{ats}%</p>
              </div>
            </div>

            <div className="mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job description
              </p>
              <div className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 lg:max-h-none lg:flex-1">
                {entry.jdPreview}
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </div>

          {/* Right column: full result (resume, changes, insights, cover letter + downloads) */}
          <div className="order-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto">
            <ResultPanel
              result={entry.response}
              jobDescription={entry.jdPreview}
              tone="professional"
              headerActions={headerActions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

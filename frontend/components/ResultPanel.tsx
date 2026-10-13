"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  Download,
  FileDown,
  FileText,
  GitCompareArrows,
  Lightbulb,
  Mail,
} from "lucide-react";
import clsx from "clsx";
import ResumePreview from "./ResumePreview";
import DiffView from "./DiffView";
import InsightsPanel from "./InsightsPanel";
import CoverLetterPanel from "./CoverLetterPanel";
import Spinner from "./Spinner";
import { ApiError, downloadDocx, downloadPdf } from "@/lib/api";
import type { CustomizeResponse, ExportPayload } from "@/lib/types";

type Tab = "resume" | "diff" | "insights" | "cover";

interface ResultPanelProps {
  result: CustomizeResponse;
  jobDescription: string;
  tone: string;
  /** Extra controls rendered next to the Download button in the header. */
  headerActions?: ReactNode;
}

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "resume", label: "Tailored Resume", icon: FileText },
  { id: "diff", label: "Changes", icon: GitCompareArrows },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "cover", label: "Cover Letter", icon: Mail },
];

export default function ResultPanel({ result, jobDescription, tone, headerActions }: ResultPanelProps) {
  const [tab, setTab] = useState<Tab>("resume");
  const [downloading, setDownloading] = useState<"" | "pdf" | "docx">("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const resume = result.customized;

  const exportPayload: ExportPayload = useMemo(
    () => ({
      contact: resume.contact,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      projects: resume.projects,
      education: resume.education,
      certifications: resume.certifications,
    }),
    [resume],
  );

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  async function handleDownload(kind: "pdf" | "docx") {
    setDownloading(kind);
    setError("");
    try {
      if (kind === "pdf") await downloadPdf(exportPayload);
      else await downloadDocx(exportPayload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setDownloading("");
    }
  }

  function handleSelect(kind: "pdf" | "docx") {
    setMenuOpen(false);
    void handleDownload(kind);
  }

  return (
    <div className="card overflow-hidden">
      {/* Header + download menu */}
      <div className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <h2 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">
          Your tailored resume
        </h2>
        {tab !== "cover" && (
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
            {headerActions}
            <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={downloading !== ""}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="btn-primary btn-sm justify-center"
            >
              {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">Download</span>
              <ChevronDown
                className={clsx("h-4 w-4 transition-transform", menuOpen && "rotate-180")}
              />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lift"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect("pdf")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileDown className="h-4 w-4 text-brand-600" />
                  PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect("docx")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-brand-600" />
                  DOCX
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {error && (
        <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700 sm:px-5">{error}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 sm:px-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setTab(item.id);
              }}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-3 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-sm",
                tab === item.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="animate-fade-in" key={tab}>
        {tab === "resume" && <ResumePreview resume={resume} />}
        {tab === "diff" && <DiffView originalText={result.original_text} resume={resume} />}
        {tab === "insights" && <InsightsPanel resume={resume} />}
        {tab === "cover" && (
          <CoverLetterPanel
            initialText={resume.cover_letter}
            jobDescription={jobDescription}
            resumeText={result.original_text}
            tone={tone}
          />
        )}
      </div>
    </div>
  );
}

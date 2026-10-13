"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileDown, FileText, RefreshCw, Sparkles } from "lucide-react";
import clsx from "clsx";
import Spinner from "./Spinner";
import {
  ApiError,
  downloadCoverLetterDocx,
  downloadCoverLetterPdf,
  streamCoverLetter,
} from "@/lib/api";

interface CoverLetterPanelProps {
  initialText: string;
  jobDescription: string;
  resumeText: string;
  tone: string;
}

export default function CoverLetterPanel({
  initialText,
  jobDescription,
  resumeText,
  tone,
}: CoverLetterPanelProps) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState<"" | "pdf" | "docx">("");
  const abortRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => () => abortRef.current?.abort(), []);

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

  async function generate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setText("");

    try {
      await streamCoverLetter(
        jobDescription,
        resumeText,
        tone,
        (token) => setText((prev) => prev + token),
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof ApiError ? err.message : "Failed to generate the cover letter.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(kind: "pdf" | "docx") {
    setMenuOpen(false);
    setDownloading(kind);
    setError("");
    try {
      const payload = { cover_letter: text };
      if (kind === "pdf") await downloadCoverLetterPdf(payload);
      else await downloadCoverLetterDocx(payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="btn-primary btn-sm flex-1 justify-center sm:flex-none sm:w-auto"
        >
          {loading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {text ? "Regenerate" : "Generate cover letter"}
        </button>

        {text && (
          <>
            <div className="relative flex-1 sm:ml-auto sm:flex-none" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                disabled={downloading !== ""}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="btn-secondary btn-sm w-full justify-center"
              >
                {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                Download
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
                    onClick={() => handleDownload("pdf")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileDown className="h-4 w-4 text-brand-600" />
                    PDF
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleDownload("docx")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4 text-brand-600" />
                    DOCX
                  </button>
                </div>
              )}
            </div>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                streaming...
              </span>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {text ? (
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700 sm:p-5">
          {text}
          {loading && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />}
        </div>
      ) : (
        !loading &&
        !error && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Generate a tailored cover letter from this job description and resume.
          </p>
        )
      )}
    </div>
  );
}

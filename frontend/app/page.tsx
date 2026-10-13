"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, RefreshCw, Wand2, X } from "lucide-react";
import logo from "@/assets/logo.png";
import Header from "@/components/Header";
import JdInput from "@/components/JdInput";
import ResumeUpload from "@/components/ResumeUpload";
import ControlsPanel from "@/components/ControlsPanel";
import ResultPanel from "@/components/ResultPanel";
import HistoryPanel from "@/components/HistoryPanel";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import {
  ApiError,
  customizeResume,
  customizeResumeText,
  fetchHistory,
  saveHistory,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { scoreColor } from "@/lib/format";
import { toClientEntry } from "@/lib/history";
import type { CustomizeResponse, CustomizableSection, HistoryEntry } from "@/lib/types";

const MIN_JD = 40;

export default function Home() {
  const [jd, setJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<CustomizableSection[]>([
    "summary",
    "skills",
    "experience",
  ]);
  const [tone, setTone] = useState("professional");
  const [includeCoverLetter, setIncludeCoverLetter] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CustomizeResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // The history entry a result was restored from. When set (and no new file is
  // uploaded) the primary action becomes "Regenerate".
  const [regenSource, setRegenSource] = useState<HistoryEntry | null>(null);

  const { user, token, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!token) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    fetchHistory(token)
      .then((rows) => {
        if (!cancelled) setHistory(rows.map(toClientEntry));
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSubmit = jd.trim().length >= MIN_JD && !!file && !loading;

  async function handleGenerate() {
    if (!file) {
      setError("Please upload your resume (PDF or DOCX).");
      return;
    }
    if (jd.trim().length < MIN_JD) {
      setError(`Please paste a fuller job description (at least ${MIN_JD} characters).`);
      return;
    }

    setLoading(true);
    setError("");
    setRegenSource(null);
    try {
      const response = await customizeResume({
        jobDescription: jd.trim(),
        file,
        sections,
        includeCoverLetter,
        tone,
      });
      setResult(response);

      if (token) {
        try {
          const saved = await saveHistory(token, {
            file_name: file.name,
            score: response.customized.match_score,
            jd_preview: jd.trim(),
            provider: response.provider,
            model: response.model,
            response,
          });
          setHistory((prev) => [toClientEntry(saved), ...prev]);
        } catch {
          /* saving to history is best-effort and never blocks the result */
        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while customizing your resume. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!regenSource) return;

    const requestedSections = (regenSource.response.sections_customized as CustomizableSection[])
      ?.length
      ? (regenSource.response.sections_customized as CustomizableSection[])
      : sections;

    setLoading(true);
    setError("");
    try {
      const response = await customizeResumeText({
        jobDescription: jd.trim() || regenSource.jdPreview,
        resumeText: regenSource.response.original_text,
        sections: requestedSections,
        includeCoverLetter: true,
        tone,
      });
      setResult(response);

      if (token) {
        try {
          const saved = await saveHistory(token, {
            file_name: regenSource.fileName,
            score: response.customized.match_score,
            jd_preview: jd.trim() || regenSource.jdPreview,
            provider: response.provider,
            model: response.model,
            response,
          });
          setHistory((prev) => [toClientEntry(saved), ...prev]);
        } catch {
          /* saving to history is best-effort and never blocks the result */
        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while regenerating your resume. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function restore(entry: HistoryEntry) {
    setResult(entry.response);
    setJd(entry.jdPreview);
    setRegenSource(entry);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section>
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-4 text-center sm:px-6 sm:pt-6 lg:px-8">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Tailor your resume to any job in seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-justify text-base leading-relaxed text-slate-600 sm:text-center sm:text-lg">
            Paste a job description and upload your resume. ResumeAid analyses the role,
            rewrites your resume to match, scores your fit, and drafts a cover letter,
            all without inventing experience you don&apos;t have.
          </p>
        </div>
      </section>

      {/* Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:gap-6 xl:grid-cols-12">
          {/* Input column */}
          <div className="xl:col-span-4">
            <div className="card top-20 space-y-5 p-5 lg:sticky sm:p-6">
              <JdInput value={jd} onChange={setJd} disabled={loading} />
              <ResumeUpload
                file={file}
                onFile={(next) => {
                  setFile(next);
                  setRegenSource(null);
                }}
                onError={setError}
                disabled={loading}
              />
              <ControlsPanel
                sections={sections}
                onSections={setSections}
                tone={tone}
                onTone={setTone}
                includeCoverLetter={includeCoverLetter}
                onIncludeCoverLetter={setIncludeCoverLetter}
                disabled={loading}
              />
              {regenSource && !file ? (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Customizing your resume...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Customize resume
                    </>
                  )}
                </button>
              )}
              <p className="text-center text-xs text-slate-400">
                {user
                  ? "Your results are saved to your account history."
                  : "Your resume file is never stored."}
              </p>
            </div>
          </div>

          {/* Output column */}
          <div className="min-w-0 xl:col-span-8">
            {loading ? (
              <div className="card flex min-h-[420px] flex-col items-center justify-center gap-4 p-10 text-center">
                <Spinner className="h-8 w-8 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Analysing the job description...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Rewriting your resume, matching keywords and scoring your fit.
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <ScoreHero result={result} />
                <ResultPanel result={result} jobDescription={jd} tone={tone} />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </main>

      {!authLoading && user && (
        <HistoryPanel entries={history} onRestore={restore} />
      )}

      {!authLoading && !user && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Want to revisit your edits later?
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Create a free account to save every tailored resume to your history.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/signup" className="btn-primary btn-sm">
                Sign up free
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h2 className="text-lg font-bold text-slate-900">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Parse",
                body: "Your PDF/DOCX is text-extracted on the FastAPI backend, and no data leaves the request.",
              },
              {
                step: "02",
                title: "Engineer the prompt",
                body: "The JD and resume are combined into a strict, hallucination-resistant prompt contract.",
              },
              {
                step: "03",
                title: "Generate & score",
                body: "The LLM returns structured JSON: rewritten resume, keyword analysis, match & ATS scores.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="text-sm font-bold text-brand-600">{item.step}</span>
                <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="relative mx-auto flex max-w-7xl items-center justify-center px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
          <Image
            src={logo}
            alt="ResumeAid logo"
            width={96}
            height={96}
            className="absolute left-4 hidden h-16 w-16 shrink-0 object-contain sm:left-6 sm:h-20 sm:w-20 lg:left-8 lg:block"
          />
          <p className="text-center">(c) {new Date().getFullYear()} ResumeAid. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function ScoreHero({ result }: { result: CustomizeResponse }) {
  const match = result.customized.match_score;
  const ats = result.customized.ats_score;
  const missing = result.customized.missing_keywords?.length ?? 0;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="card p-3 text-center sm:p-4">
        <p className="text-[11px] font-medium text-slate-500 sm:text-xs">Match</p>
        <p className={`mt-1 text-lg font-bold sm:text-2xl ${scoreColor(match)}`}>{match}%</p>
      </div>
      <div className="card p-3 text-center sm:p-4">
        <p className="text-[11px] font-medium text-slate-500 sm:text-xs">ATS</p>
        <p className={`mt-1 text-lg font-bold sm:text-2xl ${scoreColor(ats)}`}>{ats}%</p>
      </div>
      <div className="card p-3 text-center sm:p-4">
        <p className="text-[11px] font-medium text-slate-500 sm:text-xs">Gaps</p>
        <p className="mt-1 text-lg font-bold text-slate-800 sm:text-2xl">{missing}</p>
      </div>
    </div>
  );
}

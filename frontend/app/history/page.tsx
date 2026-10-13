"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import HistoryModal from "@/components/HistoryModal";
import Spinner from "@/components/Spinner";
import TableSearch from "@/components/TableSearch";
import { deleteHistory, fetchHistory } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, scoreColor } from "@/lib/format";
import { toClientEntry } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";

export default function HistoryPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<HistoryEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchHistory(token)
      .then((rows) => {
        if (!cancelled) setEntries(rows.map(toClientEntry));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleDelete(entry: HistoryEntry) {
    if (!token) return;
    setDeletingId(entry.id);
    try {
      await deleteHistory(token, Number(entry.id));
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    } catch {
      /* keep the row if the delete failed */
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = entries.filter((entry) =>
    entry.fileName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:relative lg:flex-row lg:items-center lg:justify-center">
          <div className="flex items-center justify-between gap-2 lg:contents">
            <Link
              href="/"
              title="Back to home"
              aria-label="Back to home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-brand-700 lg:absolute lg:left-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            {user && (
              <div className="flex items-center gap-2 lg:absolute lg:right-0">
                {entries.length > 0 && <TableSearch value={query} onChange={setQuery} />}
                <Link
                  href="/recycle-bin"
                  title="Recycle bin"
                  aria-label="Recycle bin"
                  className="btn-secondary btn-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">History</h1>
            <p className="text-sm text-slate-500">
              Every tailored resume you have generated, newest first.
            </p>
          </div>
        </div>

        {authLoading || loading ? (
          <div className="card flex min-h-[240px] items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <Spinner className="h-5 w-5 text-brand-600" />
            Loading your history...
          </div>
        ) : !user ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-semibold text-slate-800">You are not logged in.</p>
            <p className="text-sm text-slate-500">
              Log in to view the resumes you have saved.
            </p>
            <Link href="/login" className="btn-primary btn-sm">
              Log in
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No saved versions yet.</p>
            <p className="text-sm text-slate-500">
              Customize a resume and it will show up here.
            </p>
            <Link href="/" className="btn-primary btn-sm">
              Go to the workspace
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {filtered.map((entry) => {
                const match = entry.response?.customized?.match_score ?? entry.score;
                const ats = entry.response?.customized?.ats_score ?? entry.score;
                return (
                  <div key={entry.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {entry.fileName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActive(entry)}
                          title="View details"
                          aria-label={`View ${entry.fileName}`}
                          className="btn-secondary btn-sm"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          title="Move to recycle bin"
                          aria-label={`Delete ${entry.fileName}`}
                          className="btn-ghost btn-sm text-rose-600"
                        >
                          {deletingId === entry.id ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-5 border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">
                        Match <span className={`font-semibold ${scoreColor(match)}`}>{match}%</span>
                      </span>
                      <span className="text-slate-500">
                        ATS <span className={`font-semibold ${scoreColor(ats)}`}>{ats}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="card px-4 py-10 text-center text-sm text-slate-500">
                  No resumes match your search.
                </p>
              )}
            </div>

            <div className="card hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr className="divide-x divide-slate-200">
                    <th className="w-44 px-3 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Resume</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">Match</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">ATS</th>
                    <th className="w-28 px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((entry) => {
                    const match = entry.response?.customized?.match_score ?? entry.score;
                    const ats = entry.response?.customized?.ats_score ?? entry.score;
                    return (
                    <tr key={entry.id} className="divide-x divide-slate-100 transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{entry.fileName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`font-semibold ${scoreColor(match)}`}>{match}%</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`font-semibold ${scoreColor(ats)}`}>{ats}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActive(entry)}
                            title="View details"
                            aria-label={`View ${entry.fileName}`}
                            className="btn-secondary btn-sm"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            title="Move to recycle bin"
                            aria-label={`Delete ${entry.fileName}`}
                            className="btn-ghost btn-sm text-rose-600"
                          >
                            {deletingId === entry.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  No resumes match your search.
                </p>
              )}
            </div>
          </div>
          </>
        )}
      </main>

      {active && token && (
        <HistoryModal
          key={active.id}
          entry={active}
          token={token}
          onClose={() => setActive(null)}
          onSaved={(entry) => setEntries((prev) => [entry, ...prev])}
          onOpenEntry={(entry) => setActive(entry)}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  ArrowLeft,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import Spinner from "@/components/Spinner";
import TableSearch from "@/components/TableSearch";
import {
  deleteHistoryPermanent,
  fetchDeletedHistory,
  restoreHistory,
  restoreHistoryBulk,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, scoreColor } from "@/lib/format";
import { toClientEntry } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";

export default function RecycleBinPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDeletedHistory(token)
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

  const filtered = entries.filter((entry) =>
    entry.fileName.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const allSelected = filtered.length > 0 && filtered.every((entry) => selected.has(entry.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const everySelected = filtered.every((entry) => next.has(entry.id));
      filtered.forEach((entry) => (everySelected ? next.delete(entry.id) : next.add(entry.id)));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setMenuOpen(false);
  }

  async function handleRestore(entry: HistoryEntry) {
    if (!token) return;
    setRestoringId(entry.id);
    try {
      await restoreHistory(token, Number(entry.id));
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    } catch {
      /* keep the row if the restore failed */
    } finally {
      setRestoringId(null);
    }
  }

  async function handleBulk(action: "recover" | "delete") {
    if (!token || selected.size === 0) return;
    const ids = Array.from(selected).map(Number);
    setMenuOpen(false);
    setBulkBusy(true);
    try {
      if (action === "recover") await restoreHistoryBulk(token, ids);
      else await deleteHistoryPermanent(token, ids);
      setEntries((prev) => prev.filter((entry) => !selected.has(entry.id)));
      clearSelection();
    } catch {
      /* keep the rows if the action failed */
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:relative lg:flex-row lg:items-center lg:justify-center">
          <div className="flex items-center justify-between gap-2 lg:contents">
            <Link
              href="/history"
              title="Back to history"
              aria-label="Back to history"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-brand-700 lg:absolute lg:left-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            {user && entries.length > 0 && (
              <div className="flex items-center gap-2 lg:absolute lg:right-0">
                <TableSearch value={query} onChange={setQuery} />
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Recycle bin
            </h1>
            <p className="text-sm text-slate-500">
              Deleted resumes are kept here until you recover them.
            </p>
          </div>
        </div>

        {/* Selection toolbar */}
        {selected.size > 1 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  disabled={bulkBusy}
                  aria-label="Bulk actions"
                  className="btn-secondary btn-sm"
                >
                  {bulkBusy ? <Spinner className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
                      <button
                        type="button"
                        onClick={() => handleBulk("recover")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Recover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulk("delete")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelection}
                title="Cancel"
                aria-label="Cancel"
                className="btn-ghost btn-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {authLoading || loading ? (
          <div className="card flex min-h-[240px] items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <Spinner className="h-5 w-5 text-brand-600" />
            Loading the recycle bin...
          </div>
        ) : !user ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-semibold text-slate-800">You are not logged in.</p>
            <p className="text-sm text-slate-500">Log in to view your recycle bin.</p>
            <Link href="/login" className="btn-primary btn-sm">
              Log in
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-semibold text-slate-800">The recycle bin is empty.</p>
            <p className="text-sm text-slate-500">
              Resumes you delete from your history will appear here.
            </p>
            <Link href="/history" className="btn-primary btn-sm">
              Back to history
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {filtered.map((entry) => {
                const match = entry.response?.customized?.match_score ?? entry.score;
                const ats = entry.response?.customized?.ats_score ?? entry.score;
                return (
                  <div
                    key={entry.id}
                    className={`card p-4 ${
                      selected.has(entry.id) ? "ring-1 ring-brand-300" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleOne(entry.id)}
                        aria-label={`Select ${entry.fileName}`}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {entry.fileName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRestore(entry)}
                            disabled={restoringId === entry.id}
                            title="Recover"
                            aria-label={`Recover ${entry.fileName}`}
                            className="btn-secondary btn-sm shrink-0"
                          >
                            {restoringId === entry.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" />
                            )}
                          </button>
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
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr className="divide-x divide-slate-200">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="w-44 px-3 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Resume</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">Match</th>
                    <th className="w-24 px-4 py-3 text-center font-semibold">ATS</th>
                    <th className="w-32 px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((entry) => {
                    const match = entry.response?.customized?.match_score ?? entry.score;
                    const ats = entry.response?.customized?.ats_score ?? entry.score;
                    return (
                    <tr
                      key={entry.id}
                      className={`divide-x divide-slate-100 transition-colors hover:bg-slate-50 ${
                        selected.has(entry.id) ? "bg-brand-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleOne(entry.id)}
                          aria-label={`Select ${entry.fileName}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
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
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRestore(entry)}
                          disabled={restoringId === entry.id}
                          title="Recover"
                          aria-label={`Recover ${entry.fileName}`}
                          className="btn-secondary btn-sm"
                        >
                          {restoringId === entry.id ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                        </button>
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
    </div>
  );
}

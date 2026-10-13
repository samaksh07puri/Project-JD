"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Mail, X } from "lucide-react";
import Spinner from "./Spinner";
import { ApiError, requestPasswordReset } from "@/lib/api";
import type { ForgotPasswordResponse } from "@/lib/types";

interface ForgotPasswordModalProps {
  open: boolean;
  /** Email currently typed into the login form; prefills the field. */
  initialEmail: string;
  onClose: () => void;
}

export default function ForgotPasswordModal({
  open,
  initialEmail,
  onClose,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<ForgotPasswordResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setError("");
    setSent(null);
    setSubmitting(false);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open, initialEmail]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      setSent(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-title"
      onMouseDown={onClose}
    >
      <div
        className="card w-full max-w-md p-6 sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -right-1 -top-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 id="forgot-title" className="text-lg font-bold text-slate-900">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your account email and we&apos;ll send a recovery link.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{sent.message}</p>
            </div>

            {sent.dev_reset_url && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">
                  Dev mode: no mail server configured
                </p>
                <p className="mt-1">Use this link to reset your password:</p>
                <a
                  href={sent.dev_reset_url}
                  className="mt-1 block break-all font-medium text-brand-700 hover:underline"
                >
                  Open reset link
                </a>
              </div>
            )}

            <button type="button" onClick={onClose} className="btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>Send recovery link</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

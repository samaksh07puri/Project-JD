"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import logo from "@/assets/logo.png";
import Spinner from "./Spinner";
import PasswordStrength from "./PasswordStrength";
import { ApiError, resetPassword } from "@/lib/api";
import { evaluatePassword } from "@/lib/password";

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = evaluatePassword(password).valid;
  const canSubmit = passwordValid && password === confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!passwordValid) {
      setError("Please satisfy all password requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src={logo}
            alt="ResumeAid logo"
            width={128}
            height={128}
            className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
            priority
          />
        </Link>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:px-6">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Choose a new password
          </h1>

          {!token ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>This reset link is invalid or missing a token.</p>
              </div>
              <Link href="/login" className="btn-primary w-full">
                Back to log in
              </Link>
            </div>
          ) : done ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Your password has been reset. You can now log in.</p>
              </div>
              <Link href="/login" className="btn-primary w-full">
                Go to log in
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Pick a strong password to secure your account.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="label">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={submitting}
                      placeholder="Create a strong password"
                      className="input pl-10"
                    />
                  </div>
                  {password.length > 0 && <PasswordStrength value={password} />}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="label">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      disabled={submitting}
                      placeholder="Re-enter your password"
                      className="input pl-10"
                    />
                  </div>
                  {confirm && (
                    <p
                      className={
                        password === confirm
                          ? "mt-1.5 text-xs text-emerald-600"
                          : "mt-1.5 text-xs text-rose-600"
                      }
                    >
                      {password === confirm ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="btn-primary w-full"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Resetting...
                    </>
                  ) : (
                    <>Reset password</>
                  )}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

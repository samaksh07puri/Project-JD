"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail } from "lucide-react";
import logo from "@/assets/logo.png";
import Spinner from "./Spinner";
import PasswordStrength from "./PasswordStrength";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { evaluatePassword } from "@/lib/password";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { user, loading: authLoading, login, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const isSignup = mode === "signup";
  const passwordValid = evaluatePassword(password).valid;
  const canSubmit = isSignup ? passwordValid && password === confirm : true;

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (isSignup && !passwordValid) {
      setError("Please satisfy all password requirements.");
      return;
    }
    if (isSignup && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) await signup(email.trim(), password);
      else await login(email.trim(), password);
      router.replace("/");
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
    <div className="flex min-h-screen flex-col">
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
          <h1 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
            {isSignup ? "Create your account" : "Welcome"}
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            {isSignup
              ? "Save your tailored resumes and revisit them any time."
              : "Log in to see your saved resume history."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  placeholder={isSignup ? "Create a strong password" : "Your password"}
                  className="input pl-10"
                />
              </div>
              {isSignup && password.length > 0 && <PasswordStrength value={password} />}
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="mt-2 text-sm font-semibold text-brand-900 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {isSignup && (
              <div>
                <label htmlFor="confirm" className="label">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm"
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
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting || !canSubmit} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {isSignup ? "Creating account..." : "Logging in..."}
                </>
              ) : (
                <>{isSignup ? "Create account" : "Log in"}</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        open={showForgot}
        initialEmail={email}
        onClose={() => setShowForgot(false)}
      />
    </div>
  );
}

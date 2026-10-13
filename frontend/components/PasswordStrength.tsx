"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import { evaluatePassword } from "@/lib/password";

const FILL: Record<string, string> = {
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  strong: "bg-emerald-500",
};

const TEXT: Record<string, string> = {
  weak: "text-rose-600",
  fair: "text-amber-600",
  strong: "text-emerald-600",
};

const LABEL: Record<string, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

export default function PasswordStrength({ value }: { value: string }) {
  const { results, score, total, level } = evaluatePassword(value);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={clsx(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                index < score ? FILL[level] : "bg-slate-200",
              )}
            />
          ))}
        </div>
        {value && (
          <span className={clsx("text-xs font-semibold", TEXT[level])}>{LABEL[level]}</span>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={clsx(
              "flex items-center gap-1.5 text-xs transition-colors",
              rule.met ? "text-emerald-600" : "text-slate-400",
            )}
          >
            {rule.met ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

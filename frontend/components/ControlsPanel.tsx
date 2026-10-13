"use client";

import { FileText, Sparkles, Wand2 } from "lucide-react";
import clsx from "clsx";
import type { CustomizableSection } from "@/lib/types";

const SECTIONS: { id: CustomizableSection; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
];

const TONES = ["professional", "concise", "impactful", "technical"];

interface ControlsPanelProps {
  sections: CustomizableSection[];
  onSections: (sections: CustomizableSection[]) => void;
  tone: string;
  onTone: (tone: string) => void;
  includeCoverLetter: boolean;
  onIncludeCoverLetter: (value: boolean) => void;
  disabled?: boolean;
}

export default function ControlsPanel({
  sections,
  onSections,
  tone,
  onTone,
  includeCoverLetter,
  onIncludeCoverLetter,
  disabled,
}: ControlsPanelProps) {
  function toggle(section: CustomizableSection) {
    if (sections.includes(section)) {
      if (sections.length === 1) return;
      onSections(sections.filter((item) => item !== section));
    } else {
      onSections([...sections, section]);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="label">Sections to customize</span>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => {
            const active = sections.includes(section.id);
            return (
              <button
                key={section.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(section.id)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700",
                )}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tone" className="label">
            Writing tone
          </label>
          <select
            id="tone"
            value={tone}
            disabled={disabled}
            onChange={(event) => onTone(event.target.value)}
            className="input capitalize"
          >
            {TONES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">Extras</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onIncludeCoverLetter(!includeCoverLetter)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors",
              includeCoverLetter
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-brand-400",
            )}
          >
            <FileText className="h-4 w-4" />
            Cover letter
            <span className="ml-auto">
              {includeCoverLetter ? (
                <Sparkles className="h-4 w-4 text-brand-600" />
              ) : (
                <Wand2 className="h-4 w-4 text-slate-400" />
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

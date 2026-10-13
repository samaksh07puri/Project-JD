"use client";

interface JdInputProps {
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  disabled?: boolean;
}

export default function JdInput({
  value,
  onChange,
  minLength = 40,
  disabled,
}: JdInputProps) {
  const trimmed = value.trim().length;
  const valid = trimmed >= minLength;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="jd" className="label mb-0">
          Job Description
        </label>
      </div>
      <textarea
        id="jd"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        maxLength={20000}
        rows={9}
        placeholder="Paste the full job description here: responsibilities, required skills, qualifications..."
        className="input resize-y font-normal leading-relaxed"
      />
      <div className="mt-1.5 flex items-start justify-between gap-2">
        {trimmed > 0 && !valid ? (
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-600">
            Add at least {minLength - trimmed} more characters for accurate results.
          </p>
        ) : (
          <span />
        )}
        <span
          className={`shrink-0 whitespace-nowrap text-xs font-medium ${
            valid ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {trimmed.toLocaleString()} / 20,000
        </span>
      </div>
    </div>
  );
}

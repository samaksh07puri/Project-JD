"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TableSearch({ value, onChange }: TableSearchProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleToggle() {
    setOpen((prev) => {
      if (prev) onChange("");
      return !prev;
    });
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white transition-all duration-300 ease-out focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search resumes..."
        aria-label="Search resumes"
        className={`bg-transparent text-sm text-slate-900 outline-none transition-all duration-300 ease-out placeholder:text-slate-400 ${
          open ? "w-40 px-4 sm:w-52" : "w-0 px-0"
        }`}
      />
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Search resumes"
        title="Search resumes"
        aria-expanded={open}
        className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-brand-700"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}

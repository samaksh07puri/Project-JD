"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import clsx from "clsx";
import { formatBytes } from "@/lib/format";

interface ResumeUploadProps {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (message: string) => void;
  maxMb?: number;
  disabled?: boolean;
}

const ACCEPTED = [".pdf", ".docx"];

export default function ResumeUpload({
  file,
  onFile,
  onError,
  maxMb = 5,
  disabled,
}: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function validate(selected: File): boolean {
    const name = selected.name.toLowerCase();
    if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
      onError("Unsupported file type. Please upload a PDF or DOCX file.");
      return false;
    }
    if (selected.size > maxMb * 1024 * 1024) {
      onError(`File is too large. Maximum size is ${maxMb} MB.`);
      return false;
    }
    if (selected.size === 0) {
      onError("That file appears to be empty.");
      return false;
    }
    return true;
  }

  function handleFiles(files: FileList | null) {
    const selected = files?.[0];
    if (!selected) return;
    if (validate(selected)) onFile(selected);
  }

  return (
    <div>
      <span className="label">Resume</span>

      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFile(null)}
            disabled={disabled}
            className="btn-ghost btn-sm"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={clsx(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors",
            dragging
              ? "border-brand-500 bg-brand-50"
              : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50",
          )}
        >
          <UploadCloud className="h-6 w-6 text-brand-600" />
          <span className="text-sm font-semibold text-slate-700">
            Drop your resume here, or <span className="text-brand-700">browse</span>
          </span>
          <span className="text-xs text-slate-500">PDF or DOCX, up to {maxMb} MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

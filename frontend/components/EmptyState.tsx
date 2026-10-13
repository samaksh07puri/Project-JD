import { FileSearch, Sparkles, Upload } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload your resume",
    body: "Drop in a PDF or DOCX. We extract the text instantly on the server.",
  },
  {
    icon: FileSearch,
    title: "Paste the job description",
    body: "We analyse the JD for required skills, keywords and responsibilities.",
  },
  {
    icon: Sparkles,
    title: "Get a tailored resume",
    body: "The LLM rewrites your summary, reorders skills and optimises for ATS.",
  },
];

export default function EmptyState() {
  return (
    <div className="card flex h-full flex-col items-center justify-center p-6 text-center sm:p-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Sparkles className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900">Your tailored resume appears here</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Fill in the job description and upload your resume, then hit
        <span className="font-semibold text-brand-700"> Customize resume</span>.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-left">
              <Icon className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-sm font-semibold text-slate-800">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { CustomizedResume } from "./types";

export type DiffType = "equal" | "add" | "remove";

export interface DiffLine {
  type: DiffType;
  value: string;
}

/** Line-level LCS diff between the original resume text and the tailored resume. */
export function lineDiff(original: string, revised: string): DiffLine[] {
  const a = original.split("\n").map((line) => line.trimEnd());
  const b = revised.split("\n").map((line) => line.trimEnd());

  const n = a.length;
  const m = b.length;

  // Guard against pathological inputs; fall back to a naive diff.
  if (n * m > 4_000_000) {
    return [
      ...a.map((value) => ({ type: "remove" as DiffType, value })),
      ...b.map((value) => ({ type: "add" as DiffType, value })),
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "equal", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", value: a[i] });
      i++;
    } else {
      result.push({ type: "add", value: b[j] });
      j++;
    }
  }
  while (i < n) result.push({ type: "remove", value: a[i++] });
  while (j < m) result.push({ type: "add", value: b[j++] });

  return result;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  return lines.reduce<DiffStats>(
    (acc, line) => {
      if (line.type === "add") acc.added++;
      else if (line.type === "remove") acc.removed++;
      else acc.unchanged++;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
}

/** Render the tailored resume to plain text for diffing / download. */
export function resumeToText(resume: CustomizedResume): string {
  const lines: string[] = [];
  const { contact } = resume;

  if (contact.name) lines.push(contact.name);
  if (contact.headline) lines.push(contact.headline);
  const contactBits = [contact.email, contact.phone, contact.location, ...contact.links].filter(
    Boolean,
  );
  if (contactBits.length) lines.push(contactBits.join(" | "));

  if (resume.summary) {
    lines.push("", "PROFESSIONAL SUMMARY", "", resume.summary);
  }
  if (resume.skills.length) {
    lines.push("", "SKILLS", "", resume.skills.join(", "));
  }
  if (resume.experience.length) {
    lines.push("", "EXPERIENCE", "");
    for (const job of resume.experience) {
      lines.push([job.title, job.company].filter(Boolean).join(" | "));
      const meta = [job.location, job.dates].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      for (const bullet of job.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }
  if (resume.projects.length) {
    lines.push("PROJECTS", "");
    for (const project of resume.projects) {
      lines.push(project.name);
      if (project.description) lines.push(project.description);
      for (const bullet of project.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }
  if (resume.education.length) {
    lines.push("EDUCATION", "");
    for (const edu of resume.education) {
      lines.push([edu.degree, edu.institution].filter(Boolean).join(" | "));
      const meta = [edu.location, edu.dates].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      if (edu.details) lines.push(edu.details);
    }
    lines.push("");
  }
  if (resume.certifications.length) {
    lines.push("CERTIFICATIONS", "");
    for (const cert of resume.certifications) lines.push(`- ${cert}`);
  }

  return lines.join("\n").trim();
}

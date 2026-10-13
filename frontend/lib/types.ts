export type CustomizableSection =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education";

export interface ContactInfo {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  description: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  details: string;
}

export interface KeywordInsight {
  keyword: string;
  status: "matched" | "missing";
  importance: "high" | "medium" | "low";
}

export interface ScoreBreakdown {
  overall: number;
  keyword_coverage: number;
  skills_alignment: number;
  experience_relevance: number;
  formatting_ats: number;
  explanation: string;
}

export interface CustomizedResume {
  contact: ContactInfo;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications: string[];
  missing_keywords: string[];
  keywords: KeywordInsight[];
  match_score: number;
  ats_score: number;
  scores: ScoreBreakdown;
  match_analysis: string;
  cover_letter: string;
  change_notes: string[];
}

export interface CustomizeResponse {
  provider: string;
  model: string;
  original_text: string;
  customized: CustomizedResume;
  sections_customized: string[];
  processing_ms: number;
}

export interface ExportPayload {
  contact: ContactInfo;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications: string[];
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  fileName: string;
  score: number;
  jdPreview: string;
  response: CustomizeResponse;
  /** Set when the entry lives in the recycle bin. */
  deletedAt?: number | null;
}

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ForgotPasswordResponse {
  message: string;
  /** Present only when the backend has no SMTP configured (local testing). */
  dev_reset_url?: string | null;
}

/** A saved customization record as returned by the backend. */
export interface ServerHistoryEntry {
  id: number;
  created_at: string;
  file_name: string;
  score: number;
  jd_preview: string;
  provider: string;
  model: string;
  response: CustomizeResponse;
  deleted_at?: string | null;
}

export interface HistoryCreatePayload {
  file_name: string;
  score: number;
  jd_preview: string;
  provider: string;
  model: string;
  response: CustomizeResponse;
}

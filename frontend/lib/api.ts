import type {
  AuthResponse,
  CustomizeResponse,
  CustomizableSection,
  ExportPayload,
  ForgotPasswordResponse,
  HistoryCreatePayload,
  ServerHistoryEntry,
  User,
} from "./types";

// On Vercel "services" the frontend and API share one domain, so the API is
// reached through the same-origin rewrites declared in the root vercel.json
// (all requests use relative "/api/..." paths). Local development points the
// frontend at the separate backend via NEXT_PUBLIC_API_URL (see
// .env.local.example); when that is unset and we are not in production we fall
// back to the default local uvicorn port.
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API_URL =
  configuredApiUrl ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

/** Error carrying the backend's human-readable detail message. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* ignore */
  }
  return `Request failed with status ${response.status}.`;
}

export interface CustomizeOptions {
  jobDescription: string;
  file: File;
  sections: CustomizableSection[];
  includeCoverLetter: boolean;
  tone: string;
}

export async function customizeResume(
  options: CustomizeOptions,
): Promise<CustomizeResponse> {
  const form = new FormData();
  form.append("job_description", options.jobDescription);
  form.append("file", options.file);
  form.append("sections", JSON.stringify(options.sections));
  form.append("include_cover_letter", String(options.includeCoverLetter));
  form.append("tone", options.tone);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/customize`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection or the backend URL.",
    );
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export interface CustomizeTextOptions {
  jobDescription: string;
  resumeText: string;
  sections: CustomizableSection[];
  includeCoverLetter: boolean;
  tone: string;
}

export async function customizeResumeText(
  options: CustomizeTextOptions,
): Promise<CustomizeResponse> {
  return postJson<CustomizeResponse>("/api/customize-text", {
    job_description: options.jobDescription,
    resume_text: options.resumeText,
    sections: options.sections,
    include_cover_letter: options.includeCoverLetter,
    tone: options.tone,
  });
}

async function downloadExport(path: string, payload: unknown, filename: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError("Could not reach the server to build the download.");
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadPdf(payload: ExportPayload) {
  return downloadExport("/api/export/pdf", payload, "tailored_resume.pdf");
}

export function downloadDocx(payload: ExportPayload) {
  return downloadExport("/api/export/docx", payload, "tailored_resume.docx");
}

export interface CoverLetterExportPayload {
  cover_letter: string;
  name?: string;
}

export function downloadCoverLetterPdf(payload: CoverLetterExportPayload) {
  return downloadExport("/api/cover-letter/pdf", payload, "cover_letter.pdf");
}

export function downloadCoverLetterDocx(payload: CoverLetterExportPayload) {
  return downloadExport("/api/cover-letter/docx", payload, "cover_letter.docx");
}

/** Stream the cover letter using Server-Sent Events. */
export async function streamCoverLetter(
  jobDescription: string,
  resumeText: string,
  tone: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/cover-letter/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_description: jobDescription,
        resume_text: resumeText,
        tone,
      }),
      signal,
    });
  } catch {
    throw new ApiError("Could not reach the server to stream the cover letter.");
  }

  if (!response.ok || !response.body) {
    throw new ApiError(await parseError(response), response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function process(flushEof = false) {
    buffer += flushEof ? decoder.decode() : "";
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") throw new DoneMarker();
      try {
        const event = JSON.parse(payload);
        if (event.error) throw new ApiError(event.error);
        if (event.token) onToken(event.token);
      } catch (error) {
        if (error instanceof ApiError) throw error;
      }
    }
  }

  class DoneMarker extends Error {}

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        process(true);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      process();
    }
  } catch (error) {
    if (error instanceof DoneMarker) return;
    throw error;
  }
}

export { API_URL };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection or the backend URL.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export function signupUser(email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/signup", { email, password });
}

export function loginUser(email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/login", { email, password });
}

export async function fetchMe(token: string): Promise<User> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse>("/api/auth/forgot-password", { email });
}

export function resetPassword(token: string, password: string): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse>("/api/auth/reset-password", { token, password });
}

export async function fetchHistory(token: string): Promise<ServerHistoryEntry[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function fetchDeletedHistory(token: string): Promise<ServerHistoryEntry[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/deleted`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function restoreHistory(
  token: string,
  id: number,
): Promise<ServerHistoryEntry> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/${id}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function restoreHistoryBulk(
  token: string,
  ids: number[],
): Promise<ServerHistoryEntry[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function deleteHistoryPermanent(token: string, ids: number[]): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
}

export async function restoreAllHistory(token: string): Promise<ServerHistoryEntry[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/restore-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function saveHistory(
  token: string,
  payload: HistoryCreatePayload,
): Promise<ServerHistoryEntry> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError("Could not reach the server to save history.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json();
}

export async function clearHistory(token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
}

export async function deleteHistory(token: string, id: number): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/history/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Could not reach the server.");
  }
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
}

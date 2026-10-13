# ResumeAid

Takes a job description and your resume (PDF or DOCX), then uses an LLM to rewrite the resume so it
lines up with the role. Next.js frontend, FastAPI backend.

> Paste a job description, upload your resume, and you get back a tailored resume with match and ATS
> scores, a diff, the keywords you're missing, and a cover letter. Download as PDF, DOCX, or text.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Prompt Engineering Notes](#prompt-engineering-notes)
- [Known Limitations & Trade-offs](#known-limitations--trade-offs)

---

## Features

Core:
- Job description input with length validation and a live character counter.
- Resume upload (PDF or DOCX) with drag-and-drop and immediate file name + size display.
- Server-side text extraction via `pdfplumber` (PDF) and `python-docx` (DOCX).
- LLM customization that rewrites the summary, reorders skills, and rephrases experience bullets
  around the JD's keywords, and lists any keywords you're missing.
- Typeset resume preview.
- Downloads as PDF (ReportLab), DOCX (python-docx), and plain text.
- Error handling for invalid file types, oversized files, empty or short input, LLM failures, and
  provider rate limits.

Extras:
- Match score (0-100) for resume/JD fit, with a sub-score breakdown.
- Estimated ATS score (how cleanly applicant-tracking systems will read it).
- Line-level diff between the original and the tailored resume.
- Section-wise customization: Summary / Skills / Experience / Projects / Education.
- Cover letter generator with streaming token-by-token output.
- Per-user history of past runs.
- Email + password authentication (JWT, bcrypt-hashed) that gates history.
- Password recovery that emails a time-limited reset link (SMTP optional in development).
- Tone control: professional / concise / impactful / technical.
- Swappable LLM provider: Gemini, OpenAI, or Groq via one environment variable.

---

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS      |
| Backend   | Python 3.12, FastAPI, Pydantic v2, httpx                        |
| Parsing   | pdfplumber (PDF), python-docx (DOCX)                              |
| Exports   | ReportLab (PDF), python-docx (DOCX)                               |
| LLM       | **Google Gemini** (default), OpenAI, Groq (swappable)            |
| Auth & DB | JWT (PyJWT), bcrypt (passlib), SQLAlchemy, SQLite / Postgres      |
| Hosting   | Vercel (frontend), Render/Railway/GCP Cloud Run (backend)        |

**Default LLM:** `gemini-3.5-flash-lite` on Google AI Studio's free tier.
Change `LLM_PROVIDER` / `LLM_MODEL` to use OpenAI or Groq with no code changes.

---

## Architecture

```
+---------------------------------------------+
|              Next.js Frontend                |
|  +--------------+  +--------------------+    |
|  | JD textarea  |  | Resume upload      |    |
|  | + validation |  | (PDF / DOCX)       |    |
|  +------+-------+  +---------+----------+    |
|         +--------+-----------+                |
|                  v                            |
|        Output: preview, diff, scores,         |
|        insights, cover letter, downloads      |
+------------------+--------------------------+
                   | REST / multipart + SSE
                   v
+---------------------------------------------+
|             FastAPI Backend                   |
|  Auth: signup/login -> JWT (bcrypt-hashed)   |
|  1. Validate JD & file (type / size)         |
|  2. Extract resume text (pdfplumber/docx)    |
|  3. Build the prompt (system + user)         |
|  4. Call LLM -> strict JSON contract         |
|  5. Coerce + backfill scores (local analyzer)|
|  6. Render PDF/DOCX exports on demand        |
+----------+-----------------------+----------+
           | SQLAlchemy            | HTTPS
           v                       v
  +------------------+   +------------------------+
  |  Database         |   |  LLM Provider           |
  |  Users + History  |   |  Gemini / OpenAI / Groq |
  |  SQLite / Postgres|   +------------------------+
  +------------------+
```

---

## Project Structure

```
.
+-- backend/
|   +-- app/
|   |   +-- main.py              # FastAPI app + routes + error handlers
|   |   +-- config.py            # env-driven settings
|   |   +-- schemas.py           # Pydantic request/response models
|   |   +-- database.py          # SQLAlchemy engine/session (SQLite / Postgres)
|   |   +-- models.py            # User + HistoryItem ORM models
|   |   +-- security.py          # bcrypt hashing + JWT + current-user dependency
|   |   +-- routers/             # auth.py + history.py routers
|   |   +-- services/
|   |       +-- extractor.py     # PDF/DOCX text extraction
|   |       +-- llm.py           # multi-provider LLM client (+ SSE)
|   |       +-- prompts.py       # prompt engineering
|   |       +-- analyzer.py      # deterministic score/keyword fallback
|   |       +-- exporter.py      # PDF/DOCX rendering
|   |       +-- customizer.py    # orchestration
|   +-- requirements.txt
|   +-- Dockerfile
|   +-- render.yaml
|   +-- .env.example
+-- frontend/
|   +-- app/                     # App Router (layout, page, login, signup, globals.css)
|   +-- components/              # UI components (incl. AuthForm)
|   +-- lib/                     # api client, auth context, types, diff, formatting
|   +-- package.json
|   +-- .env.local.example
+-- .gitignore
+-- README.md
```

---

## Local Setup

### Prerequisites
- **Node.js** 18.18+ and npm
- **Python** 3.11+
- An LLM API key (free from [Google AI Studio](https://aistudio.google.com/apikey))

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then add your API key
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`, with interactive docs at `/docs`.
The database (SQLite by default) and its tables are created automatically on first start.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Description                                              | Default                     |
| ------------------- | -------------------------------------------------------- | --------------------------- |
| `LLM_PROVIDER`      | `gemini` \| `openai` \| `groq`                           | `gemini`                    |
| `LLM_MODEL`         | Model name for the provider                              | `gemini-3.5-flash-lite`     |
| `GEMINI_API_KEY`    | Google AI Studio key                                     | -                           |
| `OPENAI_API_KEY`    | OpenAI key                                               | -                           |
| `GROQ_API_KEY`      | Groq key                                                 | -                           |
| `MAX_UPLOAD_MB`     | Max upload size                                          | `5`                         |
| `REQUEST_TIMEOUT`   | LLM request timeout (seconds)                            | `120`                       |
| `ALLOWED_ORIGINS`   | Comma-separated CORS origins, or `*`                     | `*`                         |
| `JWT_SECRET`        | Secret used to sign JWT access tokens                    | dev default (**change it**) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes               | `10080` (7 days)            |
| `DATABASE_URL`      | SQLAlchemy URL (`sqlite:///...` or a Postgres DSN)       | `sqlite:///./resume_aid.db` |
| `SECRET_ENCRYPTION_KEY` | Master key used to decrypt any `enc:`-prefixed secret (optional) | - |
| `FRONTEND_URL`      | Public frontend URL, used to build password-reset links   | `http://localhost:3000`     |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Password-reset link lifetime (minutes)         | `30`                        |
| `SMTP_HOST`         | SMTP server for recovery emails (empty = log link)        | -                           |
| `SMTP_PORT`         | SMTP port                                                 | `587`                       |
| `SMTP_USER`         | SMTP username                                             | -                           |
| `SMTP_PASSWORD`     | SMTP password                                             | -                           |
| `SMTP_FROM`         | From address for recovery emails                          | SMTP user                   |
| `SMTP_TLS`          | Use STARTTLS                                              | `true`                      |

### Frontend (`frontend/.env.local`)

| Variable               | Description                  | Default                 |
| ---------------------- | ---------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`  | Base URL of the FastAPI API  | `http://localhost:8000` |

> **Never commit real API keys.** Only `.env.example` files are tracked.

### Encrypted secrets (optional)

Sensitive values can be stored as ciphertext instead of plaintext. Any value
prefixed with `enc:` is transparently decrypted on startup, so the app keeps
working unchanged. This protects your key **at rest** — in the `.env` file, in
backups, in screenshots, or if you choose to commit the encrypted values.

```bash
cd backend
python scripts/manage_secrets.py keygen        # print a fresh master key
python scripts/manage_secrets.py encrypt "sk-..."   # encrypt one value
python scripts/manage_secrets.py encrypt-env   # encrypt the sensitive keys in .env in place
```

The encrypted fields are `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`,
`JWT_SECRET`, `SMTP_PASSWORD` and `DATABASE_URL`. After `encrypt-env` your `.env` holds **ciphertext only**:

```
GEMINI_API_KEY=enc:gAAAAAB...
```

Keep the plaintext master key **out of `.env`** and supply it via the
environment instead, so the file is safe to share:

```bash
# Windows (persists for future terminals)
setx SECRET_ENCRYPTION_KEY "<your-master-key>"
# macOS / Linux
export SECRET_ENCRYPTION_KEY="<your-master-key>"   # add to your shell profile
```

In production, set `SECRET_ENCRYPTION_KEY` in your hosting platform's secret
store (Render/Vercel/Cloud Run).

**Security model / trade-off:** encryption protects the secrets *at rest* — in
the `.env` file, in backups, in screenshots, or if you commit the ciphertext.
The master key is still required at runtime to decrypt them, so it is the one
value you must keep private; anyone who can read the running process's
environment can read the decrypted values, which is true of any at-rest scheme.
Encryption is only as strong as that master key — use a long random value and
rotate it if it ever leaks.

The frontend holds no secrets — `NEXT_PUBLIC_API_URL` is a public URL and the
LLM key never leaves the backend.

---

## API Reference

| Method | Endpoint                    | Description                                        |
| ------ | --------------------------- | -------------------------------------------------- |
| `GET`  | `/api/health`               | Health + active provider/model info                |
| `POST` | `/api/customize`            | Multipart: `job_description`, `file`, `sections`, `include_cover_letter`, `tone` |
| `POST` | `/api/customize-text`       | JSON variant using pre-extracted resume text       |
| `POST` | `/api/export/pdf`           | Render structured resume as PDF                    |
| `POST` | `/api/export/docx`          | Render structured resume as DOCX                   |
| `POST` | `/api/cover-letter`         | Generate a cover letter                            |
| `POST` | `/api/cover-letter/stream`  | **SSE** stream of the cover letter                 |
| `POST` | `/api/auth/signup`          | Create an account and return JWT + user            |
| `POST` | `/api/auth/login`           | Log in and return JWT + user                       |
| `GET`  | `/api/auth/me`              | Current user (**Bearer** token)                    |
| `POST` | `/api/auth/forgot-password` | Email a password-reset link (404 if no such email) |
| `POST` | `/api/auth/reset-password`  | Set a new password using the emailed token         |
| `GET`  | `/api/history`              | List the current user's saved results (auth)       |
| `POST` | `/api/history`              | Save a result to history (auth)                    |
| `DELETE` | `/api/history`            | Clear all history (auth)                           |
| `DELETE` | `/api/history/{id}`       | Delete one history item (auth)                     |

Auth and history endpoints expect an `Authorization: Bearer <token>` header (returned by
signup/login). The customize, export, and cover-letter endpoints don't need auth.

> **Password reset without SMTP:** if `SMTP_HOST` is unset, the backend logs the reset link to
> the server console and returns it in the `forgot-password` response as `dev_reset_url`, so the
> flow is fully testable locally. Configure SMTP for real email delivery in production.

Example:

```bash
curl -X POST http://localhost:8000/api/customize \
  -F "job_description=We are hiring a backend engineer with Python, FastAPI and AWS..." \
  -F "file=@resume.pdf" \
  -F 'sections=["summary","skills","experience"]' \
  -F "include_cover_letter=true"
```

---

## Deployment

### Option A — one Vercel project (services)

The root `vercel.json` declares two **services** (`backend` = FastAPI, `frontend` = Next.js) with
top-level rewrites: `/api/*` -> `backend`, everything else -> `frontend`. One project, one domain,
no CORS and no `NEXT_PUBLIC_API_URL` to wire up (frontend calls same-origin `/api/...`).

1. Import the repo into Vercel as a single project.
2. Add these project environment variables:
   - `GEMINI_API_KEY` (or `OPENAI_API_KEY` / `GROQ_API_KEY`)
   - `JWT_SECRET` (a long random string)
   - `FRONTEND_URL` (your Vercel URL, for password-reset links)
   - `DATABASE_URL` (a Postgres DSN — **required here**, because Vercel's filesystem is read-only
     so SQLite cannot persist). Without it, customization still works but accounts/history won't.
3. Deploy. The app is served from the project's `*.vercel.app` domain.

> Limitations on serverless Vercel: request bodies are capped (~4.5 MB), long LLM calls must fit
> the function time limit, and streaming (SSE) may be buffered. For heavy use, prefer Option B.

### Option B — split frontend + backend

**Frontend (Vercel):** import the repo, set **Root Directory** to `frontend`, and add
`NEXT_PUBLIC_API_URL` = your backend URL. (Remove the root `vercel.json` services block first, or
deploy the `frontend` directory as its own project.)

**Backend (Render / Railway / Google Cloud Run):**

**Render** (uses `backend/render.yaml`):
1. Create a new Blueprint from the repo.
2. Set `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL) as secret env vars.

**Docker / Cloud Run:**
```bash
cd backend
docker build -t resume-customizer-api .
docker run -p 8000:8000 --env-file .env resume-customizer-api
```

After deploying, set the backend's `ALLOWED_ORIGINS` to your frontend URL and the frontend's
`NEXT_PUBLIC_API_URL` to the backend URL.

---

## Prompt Engineering Notes

The prompt lives in `backend/app/services/prompts.py`. A few decisions worth calling out:

- The model has to return one JSON object matching a fixed schema, so the backend can validate and
  render it without guesswork.
- The system prompt bans inventing employers, dates, metrics or skills. Anything it can't find goes
  into `missing_keywords` instead of being made up.
- It reuses the JD's own wording when the candidate actually has that experience, since matching the
  job posting's terms helps with ATS.
- Bullets get rewritten in STAR/CAR shape: action verb, what was done, the tech involved, the impact.
- Standard section headings and plain text, no tables or graphics, so parsers read it cleanly.
- The sections and tone the user picks are passed straight into the user prompt.
- If the model leaves out scores or returns something odd, `analyzer.py` fills them in from local
  keyword overlap, so the UI never shows blanks.

---

## Known Limitations & Trade-offs

- Scores are estimates, not ground truth. They come from the model, get normalized and clamped, and
  sit on top of a floor from the local keyword analysis.
- Image-only (scanned) PDFs have no text to pull out, so they're rejected with a message. No OCR.
- Customizing works without an account, but history is tied to one (JWT auth + a SQLAlchemy
  database), which is why it needs a login and follows you across devices.
- SQLite is fine locally (`resume_aid.db`), but on Render's free tier the file is wiped on redeploy.
  Set `DATABASE_URL` to a Postgres DSN if you want history to stick around.
- PDF and DOCX are rendered server-side so they look the same in every browser. The "Print" button
  uses a print stylesheet that isolates just the resume.
- Gemini and OpenAI support JSON mode natively. Responses are still parsed defensively (strip code
  fences, recover from stray braces) so small formatting differences don't break anything.

---

## License

Built as a Full Stack Developer assignment submission. Free to use and adapt.

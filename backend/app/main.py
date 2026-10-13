"""FastAPI application exposing the ResumeAid API."""
from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from . import __version__
from .config import get_settings
from .database import init_db
from .routers import auth as auth_router
from .routers import history as history_router
from .schemas import (
    CoverLetterExportRequest,
    CoverLetterRequest,
    CustomizeResponse,
    CustomizeTextRequest,
    ExportRequest,
)
from .services import customizer, exporter
from .services.extractor import ExtractionError, extract_text
from .services.llm import LLMError

logger = logging.getLogger("resume_aid")
logging.basicConfig(level=logging.INFO)

# Never log request URLs: they carry the API key as a query parameter.
for noisy in ("httpx", "httpcore"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ResumeAid API",
    description="Tailor a resume to a job description using an LLM.",
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(history_router.router)


@app.exception_handler(LLMError)
async def _llm_error_handler(_: Request, exc: LLMError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(ExtractionError)
async def _extraction_error_handler(_: Request, exc: ExtractionError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/")
async def root() -> dict:
    return {
        "name": "ResumeAid API",
        "version": __version__,
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        "docs": "/docs",
    }


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        "api_key_configured": bool(settings.active_api_key()),
    }


def _parse_sections(raw: str | None) -> list[str]:
    if not raw:
        return ["summary", "skills", "experience"]
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return [section.strip() for section in raw.split(",") if section.strip()]


def _validate_jd(job_description: str) -> str:
    jd = (job_description or "").strip()
    if len(jd) < 40:
        raise HTTPException(
            status_code=422,
            detail="Please paste a fuller job description (at least 40 characters).",
        )
    if len(jd) > 20000:
        raise HTTPException(
            status_code=422, detail="The job description is too long (20,000 character limit)."
        )
    return jd


async def _read_upload(file: UploadFile) -> bytes:
    name = (file.filename or "").lower()
    if not name.endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=422, detail="Unsupported file type. Please upload a PDF or DOCX file."
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum size is {settings.max_upload_mb} MB.",
        )
    return data


@app.post("/api/customize", response_model=CustomizeResponse)
async def customize(
    job_description: str = Form(...),
    file: UploadFile = File(...),
    sections: str | None = Form(default=None),
    include_cover_letter: bool = Form(default=False),
    tone: str = Form(default="professional"),
) -> CustomizeResponse:
    """Upload a resume file + JD text and receive a tailored resume."""
    jd = _validate_jd(job_description)
    data = await _read_upload(file)
    resume_text = extract_text(file.filename or "", data)
    logger.info("Customizing resume (%s bytes, %d chars) for JD (%d chars)",
                len(data), len(resume_text), len(jd))
    return await customizer.customize_resume(
        jd, resume_text, _parse_sections(sections), include_cover_letter, tone
    )


@app.post("/api/customize-text", response_model=CustomizeResponse)
async def customize_text(payload: CustomizeTextRequest) -> CustomizeResponse:
    """Customize using already-extracted resume text (used by the client-side flow)."""
    jd = _validate_jd(payload.job_description)
    if len(payload.resume_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="The resume text is too short to process.")
    return await customizer.customize_resume(
        jd,
        payload.resume_text,
        list(payload.sections),
        payload.include_cover_letter,
        payload.tone,
    )


@app.post("/api/export/pdf")
async def export_pdf(payload: ExportRequest) -> Response:
    pdf_bytes = exporter.render_pdf(payload)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="tailored_resume.pdf"'},
    )


@app.post("/api/export/docx")
async def export_docx(payload: ExportRequest) -> Response:
    docx_bytes = exporter.render_docx(payload)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="tailored_resume.docx"'},
    )


@app.post("/api/cover-letter")
async def cover_letter(payload: CoverLetterRequest) -> dict:
    text = await customizer.generate_cover_letter_text(
        payload.job_description, payload.resume_text, payload.tone
    )
    return {"cover_letter": text}


@app.post("/api/cover-letter/pdf")
async def cover_letter_pdf(payload: CoverLetterExportRequest) -> Response:
    pdf_bytes = exporter.render_cover_letter_pdf(payload.cover_letter, payload.name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cover_letter.pdf"'},
    )


@app.post("/api/cover-letter/docx")
async def cover_letter_docx(payload: CoverLetterExportRequest) -> Response:
    docx_bytes = exporter.render_cover_letter_docx(payload.cover_letter, payload.name)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="cover_letter.docx"'},
    )


@app.post("/api/cover-letter/stream")
async def cover_letter_stream(payload: CoverLetterRequest) -> StreamingResponse:
    """Server-Sent Events stream of the cover letter for real-time UI updates."""
    generator = customizer.stream_cover_letter(
        payload.job_description, payload.resume_text, payload.tone
    )

    async def event_stream():
        try:
            async for token in generator:
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except LLMError as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

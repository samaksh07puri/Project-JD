"""Pydantic request/response models shared across the API."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

CustomizableSection = Literal["summary", "skills", "experience", "projects", "education"]


def validate_password_strength(value: str) -> str:
    """Enforce the password policy shared with the frontend.

    8+ characters (checked via Field) with an uppercase, lowercase, digit and
    special character.
    """
    missing: list[str] = []
    if not re.search(r"[A-Z]", value):
        missing.append("an uppercase letter")
    if not re.search(r"[a-z]", value):
        missing.append("a lowercase letter")
    if not re.search(r"[0-9]", value):
        missing.append("a number")
    if not re.search(r"[^A-Za-z0-9]", value):
        missing.append("a special character")
    if missing:
        raise ValueError("Password must include " + ", ".join(missing) + ".")
    return value


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    dates: str = ""
    bullets: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    bullets: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    location: str = ""
    dates: str = ""
    details: str = ""


class ContactInfo(BaseModel):
    name: str = ""
    headline: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    links: list[str] = Field(default_factory=list)


class KeywordInsight(BaseModel):
    keyword: str
    status: Literal["matched", "missing"]
    importance: Literal["high", "medium", "low"] = "medium"


class ScoreBreakdown(BaseModel):
    overall: int = 0
    keyword_coverage: int = 0
    skills_alignment: int = 0
    experience_relevance: int = 0
    formatting_ats: int = 0
    explanation: str = ""


class CustomizedResume(BaseModel):
    """Structured, LLM-tailored resume content."""

    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    keywords: list[KeywordInsight] = Field(default_factory=list)
    match_score: int = 0
    ats_score: int = 0
    scores: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    match_analysis: str = ""
    cover_letter: str = ""
    change_notes: list[str] = Field(default_factory=list)


class CustomizeResponse(BaseModel):
    provider: str
    model: str
    original_text: str
    customized: CustomizedResume
    sections_customized: list[str] = Field(default_factory=list)
    processing_ms: int = 0


class CustomizeTextRequest(BaseModel):
    """Request body used when the client uploads the resume as extracted text."""

    job_description: str
    resume_text: str
    sections: list[CustomizableSection] = Field(
        default_factory=lambda: ["summary", "skills", "experience"]
    )
    include_cover_letter: bool = False
    tone: str = "professional"


class ExportRequest(BaseModel):
    """Payload used to render PDF/DOCX downloads from the structured resume."""

    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class CoverLetterRequest(BaseModel):
    job_description: str
    resume_text: str
    tone: str = "professional"


class CoverLetterExportRequest(BaseModel):
    """Payload used to render a cover letter as PDF/DOCX."""

    cover_letter: str
    name: str = ""


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _strong_password(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: EmailStr
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # Only populated when SMTP is not configured, so the flow can be tested
    # locally without a mail server. Never returned in production with SMTP set.
    dev_reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _strong_password(cls, value: str) -> str:
        return validate_password_strength(value)


class HistoryCreate(BaseModel):
    """A saved customization result. `response` is a full CustomizeResponse dict."""

    file_name: str = Field(default="resume", max_length=255)
    score: int = 0
    jd_preview: str = ""
    provider: str = ""
    model: str = ""
    response: dict[str, Any]


class HistoryRead(BaseModel):
    id: int
    created_at: datetime
    file_name: str
    score: int
    jd_preview: str
    provider: str
    model: str
    response: dict[str, Any]
    deleted_at: datetime | None = None


class HistoryIdsRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)

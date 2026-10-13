"""Orchestrates JD + resume -> tailored resume using the LLM plus local fallbacks."""
from __future__ import annotations

import time
from typing import Any

from ..config import get_settings
from ..schemas import CustomizedResume, CustomizeResponse, KeywordInsight
from . import analyzer, prompts
from .llm import LLMClient, LLMError


def _as_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return default


def _str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        items = []
        for item in value:
            if isinstance(item, str):
                items.append(item)
            elif isinstance(item, (int, float)):
                items.append(str(item))
        return items
    return []


def _dict_list(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def _clean_int(value: Any, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        num = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, num))


def _clean_int_or_none(value: Any) -> int | None:
    """Like _clean_int but distinguishes 'explicitly absent' from a real 0."""
    if value is None or value == "":
        return None
    return _clean_int(value)


def _sanitize(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalise the model's output so a single malformed field can't lose the rest."""
    contact = raw.get("contact")
    if isinstance(contact, dict):
        contact = {
            "name": _as_str(contact.get("name")),
            "headline": _as_str(contact.get("headline")),
            "email": _as_str(contact.get("email")),
            "phone": _as_str(contact.get("phone")),
            "location": _as_str(contact.get("location")),
            "links": _str_list(contact.get("links")),
        }
    else:
        contact = {}

    scores = raw.get("scores")
    if isinstance(scores, dict):
        scores = {
            "overall": _clean_int_or_none(scores.get("overall")),
            "keyword_coverage": _clean_int_or_none(scores.get("keyword_coverage")),
            "skills_alignment": _clean_int_or_none(scores.get("skills_alignment")),
            "experience_relevance": _clean_int_or_none(scores.get("experience_relevance")),
            "formatting_ats": _clean_int_or_none(scores.get("formatting_ats")),
            "explanation": _as_str(scores.get("explanation")),
        }
        scores = {key: value for key, value in scores.items() if value is not None}
    else:
        scores = {}

    keywords: list[dict[str, Any]] = []
    for item in _dict_list(raw.get("keywords")):
        keyword = _as_str(item.get("keyword"))
        if not keyword:
            continue
        status = "missing" if item.get("status") == "missing" else "matched"
        importance = item.get("importance")
        if importance not in {"high", "medium", "low"}:
            importance = "medium"
        keywords.append({"keyword": keyword, "status": status, "importance": importance})

    experience = []
    for item in _dict_list(raw.get("experience")):
        experience.append(
            {
                "title": _as_str(item.get("title")),
                "company": _as_str(item.get("company")),
                "location": _as_str(item.get("location")),
                "dates": _as_str(item.get("dates")),
                "bullets": _str_list(item.get("bullets")),
            }
        )

    projects = []
    for item in _dict_list(raw.get("projects")):
        projects.append(
            {
                "name": _as_str(item.get("name")),
                "description": _as_str(item.get("description")),
                "bullets": _str_list(item.get("bullets")),
            }
        )

    education = []
    for item in _dict_list(raw.get("education")):
        education.append(
            {
                "degree": _as_str(item.get("degree")),
                "institution": _as_str(item.get("institution")),
                "location": _as_str(item.get("location")),
                "dates": _as_str(item.get("dates")),
                "details": _as_str(item.get("details")),
            }
        )

    result = {
        "contact": contact,
        "summary": _as_str(raw.get("summary")),
        "skills": _str_list(raw.get("skills")),
        "experience": experience,
        "projects": projects,
        "education": education,
        "certifications": _str_list(raw.get("certifications")),
        "missing_keywords": _str_list(raw.get("missing_keywords")),
        "keywords": keywords,
        "scores": scores,
        "match_analysis": _as_str(raw.get("match_analysis")),
        "cover_letter": _as_str(raw.get("cover_letter")),
        "change_notes": _str_list(raw.get("change_notes")),
    }
    match_score = _clean_int_or_none(raw.get("match_score"))
    ats_score = _clean_int_or_none(raw.get("ats_score"))
    if match_score is not None:
        result["match_score"] = match_score
    if ats_score is not None:
        result["ats_score"] = ats_score
    return result


def _coerce_resume(raw: dict[str, Any], jd: str, resume_text: str) -> CustomizedResume:
    """Build a CustomizedResume, tolerating partial/odd LLM output."""
    try:
        resume = CustomizedResume.model_validate(_sanitize(raw))
    except Exception:  # noqa: BLE001 - last-resort fall back to a clean resume
        resume = CustomizedResume()

    # Ensure scores exist and are sane, using local analysis as a floor.
    local_match, matched, missing = analyzer.score_match(jd, resume_text)
    local_ats = analyzer.estimate_ats_score(resume_text)

    def _clamp(value: Any, fallback: int) -> int:
        try:
            num = int(round(float(value)))
        except (TypeError, ValueError):
            return fallback
        return max(0, min(100, num))

    resume.match_score = _clamp(resume.match_score or local_match, local_match)
    resume.ats_score = _clamp(resume.ats_score or local_ats, local_ats)
    resume.scores.overall = _clamp(resume.scores.overall or resume.match_score, resume.match_score)
    resume.scores.keyword_coverage = _clamp(
        resume.scores.keyword_coverage, round(len(matched) / max(1, len(matched) + len(missing)) * 100)
    )
    resume.scores.skills_alignment = _clamp(resume.scores.skills_alignment, resume.match_score)
    resume.scores.experience_relevance = _clamp(
        resume.scores.experience_relevance, resume.match_score
    )
    resume.scores.formatting_ats = _clamp(resume.scores.formatting_ats, local_ats)

    # Guarantee keyword insights + missing keywords.
    if not resume.keywords:
        resume.keywords = [
            KeywordInsight(keyword=kw, status="matched", importance="medium") for kw in matched[:20]
        ] + [
            KeywordInsight(keyword=kw, status="missing", importance="high") for kw in missing[:20]
        ]
    if not resume.missing_keywords:
        resume.missing_keywords = [
            kw.keyword for kw in resume.keywords if kw.status == "missing"
        ] or missing[:15]

    return resume


async def customize_resume(
    job_description: str,
    resume_text: str,
    sections: list[str],
    include_cover_letter: bool,
    tone: str = "professional",
) -> CustomizeResponse:
    """Run the full customization pipeline and return a structured response."""
    settings = get_settings()
    if not sections:
        sections = ["summary", "skills", "experience"]

    client = LLMClient(settings)
    user_prompt = prompts.build_user_prompt(
        job_description, resume_text, sections, include_cover_letter, tone
    )

    started = time.perf_counter()
    raw = await client.generate_json(prompts.SYSTEM_PROMPT, user_prompt, temperature=0.4)
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    resume = _coerce_resume(raw, job_description, resume_text)

    return CustomizeResponse(
        provider=settings.llm_provider,
        model=settings.llm_model,
        original_text=resume_text,
        customized=resume,
        sections_customized=sections,
        processing_ms=elapsed_ms,
    )


async def generate_cover_letter_text(
    job_description: str, resume_text: str, tone: str = "professional"
) -> str:
    client = LLMClient(get_settings())
    prompt = prompts.build_cover_letter_prompt(job_description, resume_text, tone)
    return await client.generate_text(prompts.COVER_LETTER_SYSTEM_PROMPT, prompt, temperature=0.7)


def stream_cover_letter(
    job_description: str, resume_text: str, tone: str = "professional"
):
    """Return the async generator that streams the cover letter token by token."""
    client = LLMClient(get_settings())
    prompt = prompts.build_cover_letter_prompt(job_description, resume_text, tone)
    return client.stream_text(prompts.COVER_LETTER_SYSTEM_PROMPT, prompt, temperature=0.7)


__all__ = [
    "customize_resume",
    "generate_cover_letter_text",
    "stream_cover_letter",
    "LLMError",
]

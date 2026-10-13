"""Lightweight local analysis used as a deterministic fallback and for keyword insight.

These helpers do not replace the LLM but guarantee that match/ATS scores and keyword
insights are always present, even if the model omits them.
"""
from __future__ import annotations

import re

STOPWORDS = {
    "and", "the", "for", "with", "you", "your", "our", "are", "will", "that", "this",
    "have", "has", "from", "not", "but", "all", "any", "can", "into", "out", "who",
    "what", "when", "where", "which", "their", "them", "they", "his", "her", "its",
    "a", "an", "of", "to", "in", "on", "at", "as", "by", "or", "is", "be", "we",
    "us", "it", "if", "do", "does", "job", "role", "work", "team", "teams", "years",
    "year", "experience", "strong", "good", "great", "must", "should", "plus",
    "about", "across", "within", "ability", "including", "etc", "using", "use",
}

# Common technical / professional skills to look for explicitly.
SKILL_LEXICON = {
    "python", "java", "javascript", "typescript", "react", "next.js", "node.js",
    "fastapi", "flask", "django", "sql", "postgresql", "mysql", "mongodb", "redis",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "git",
    "rest", "graphql", "html", "css", "tailwind", "linux", "bash", "pandas",
    "numpy", "pytorch", "tensorflow", "scikit-learn", "ml", "machine learning",
    "deep learning", "nlp", "llm", "langchain", "openai", "gemini", "groq",
    "microservices", "agile", "scrum", "figma", "redux", "vue", "angular",
    "spark", "kafka", "airflow", "tableau", "power bi", "excel", "unit testing",
    "pytest", "jira", "cv", "at", "rest api", "api",
}


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]{1,}", text.lower())
    return [w.strip("-./") for w in words if w not in STOPWORDS and len(w) > 2]


def extract_jd_keywords(job_description: str, limit: int = 30) -> list[str]:
    """Return the most salient keywords from the JD, skills first then frequent terms."""
    tokens = _tokens(job_description)
    frequency: dict[str, int] = {}
    for token in tokens:
        frequency[token] = frequency.get(token, 0) + 1

    skills = [kw for kw in SKILL_LEXICON if kw in job_description.lower()]
    ranked_terms = sorted(frequency.items(), key=lambda item: (-item[1], item[0]))
    terms = [term for term, _ in ranked_terms]

    ordered: list[str] = []
    for item in skills + terms:
        if item not in ordered:
            ordered.append(item)
    return ordered[:limit]


def keyword_coverage(job_description: str, resume_text: str) -> tuple[list[str], list[str]]:
    """Return (matched, missing) JD keywords against the resume text."""
    keywords = extract_jd_keywords(job_description)
    resume_lower = resume_text.lower()
    matched = [kw for kw in keywords if kw in resume_lower]
    missing = [kw for kw in keywords if kw not in resume_lower]
    return matched, missing


def score_match(job_description: str, resume_text: str) -> tuple[int, list[str], list[str]]:
    """Compute a deterministic 0-100 match score from keyword overlap."""
    matched, missing = keyword_coverage(job_description, resume_text)
    total = len(matched) + len(missing)
    if total == 0:
        return 0, matched, missing
    score = round(len(matched) / total * 100)
    return max(0, min(100, score)), matched, missing


def estimate_ats_score(resume_text: str) -> int:
    """Rough ATS heuristic: length, contact info, section headings, measurable results."""
    score = 100
    lower = resume_text.lower()
    words = len(resume_text.split())

    if words < 250:
        score -= 20
    elif words > 1200:
        score -= 10

    if "@" not in resume_text:
        score -= 10
    if not re.search(r"\+?\d[\d\s().-]{7,}\d", resume_text):
        score -= 5

    headings = ["experience", "education", "skills", "summary"]
    score -= 5 * sum(1 for h in headings if h not in lower)

    if not re.search(r"\d", resume_text):
        score -= 10

    return max(0, min(100, score))

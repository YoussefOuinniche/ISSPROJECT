"""Normalization stage for market intelligence.

Responsibility:
- normalize role/skill names, remove duplicates, and apply taxonomy mapping
- transform parsed signals into app-ready records with stable shape
"""

from collections import Counter
from dataclasses import dataclass
import re
from typing import Sequence

from .parser import ParsedMarketSignal


@dataclass(slots=True)
class NormalizedMarketRecord:
    """Canonical skill insight used by downstream services."""

    skill: str
    frequency: int
    category: str

    def to_dict(self) -> dict[str, object]:
        """Return serializer-friendly output structure."""

        return {
            "skill": self.skill,
            "frequency": self.frequency,
            "category": self.category,
        }


SKILL_NORMALIZATION_RULES: dict[str, tuple[str, ...]] = {
    "Python": ("python", "python3", "python 3", "py"),
    "JavaScript": ("javascript", "js"),
    "TypeScript": ("typescript", "ts"),
    "SQL": ("sql", "postgres sql", "mysql sql"),
    "REST APIs": ("rest api", "restful api", "rest apis", "restful apis"),
    "Machine Learning": ("machine learning", "ml"),
    "Deep Learning": ("deep learning", "dl"),
    "Data Analysis": ("data analysis", "analytics"),
    "Data Science": ("data science"),
    "Natural Language Processing": ("nlp", "natural language processing"),
    "Computer Vision": ("computer vision", "cv"),
    "FastAPI": ("fastapi",),
    "Django": ("django",),
    "Flask": ("flask",),
    "Node.js": ("node", "nodejs", "node.js"),
    "React": ("react", "react.js", "reactjs"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",),
    "GCP": ("gcp", "google cloud", "google cloud platform"),
    "Docker": ("docker",),
    "Kubernetes": ("kubernetes", "k8s"),
    "CI/CD": ("ci/cd", "cicd", "continuous integration", "continuous delivery"),
    "Git": ("git",),
    "GitHub": ("github",),
    "PostgreSQL": ("postgresql", "postgres"),
    "MongoDB": ("mongodb", "mongo"),
    "Pandas": ("pandas",),
    "NumPy": ("numpy",),
    "PyTorch": ("pytorch",),
    "TensorFlow": ("tensorflow",),
    "Scikit-learn": ("scikit-learn", "sklearn"),
    "Airflow": ("airflow",),
    "Spark": ("spark", "apache spark"),
    "System Design": ("system design",),
    "Microservices": ("microservices", "microservice"),
}

SKILL_CATEGORIES: dict[str, str] = {
    "Python": "programming",
    "JavaScript": "programming",
    "TypeScript": "programming",
    "SQL": "programming",
    "Machine Learning": "AI / data",
    "Deep Learning": "AI / data",
    "Data Analysis": "AI / data",
    "Data Science": "AI / data",
    "Natural Language Processing": "AI / data",
    "Computer Vision": "AI / data",
    "Pandas": "AI / data",
    "NumPy": "AI / data",
    "PyTorch": "AI / data",
    "TensorFlow": "AI / data",
    "Scikit-learn": "AI / data",
    "Spark": "AI / data",
    "AWS": "cloud / devops",
    "Azure": "cloud / devops",
    "GCP": "cloud / devops",
    "Docker": "cloud / devops",
    "Kubernetes": "cloud / devops",
    "CI/CD": "cloud / devops",
    "FastAPI": "backend",
    "Django": "backend",
    "Flask": "backend",
    "Node.js": "backend",
    "REST APIs": "backend",
    "Microservices": "backend",
    "PostgreSQL": "backend",
    "MongoDB": "backend",
    "React": "frontend",
    "Git": "tooling",
    "GitHub": "tooling",
    "Airflow": "tooling",
    "System Design": "tooling",
}

_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in SKILL_NORMALIZATION_RULES.items():
    _ALIAS_TO_CANONICAL[_normalize_key := " ".join(canonical.lower().split())] = canonical
    for alias in aliases:
        _ALIAS_TO_CANONICAL[" ".join(alias.lower().split())] = canonical


def normalize_market_data(signals: Sequence[ParsedMarketSignal]) -> Sequence[NormalizedMarketRecord]:
    """Normalize parsed market signals into canonical records.

    Args:
        signals: Parsed outputs from the parser stage.

    Returns:
        A frequency-ranked list of normalized skill insights.
    """

    frequencies: Counter[str] = Counter()

    for signal in signals:
        per_signal_skills = _collect_signal_skills(signal)
        for skill in per_signal_skills:
            frequencies[skill] += 1

    ranked_records = [
        NormalizedMarketRecord(
            skill=skill,
            frequency=count,
            category=_categorize_skill(skill),
        )
        for skill, count in frequencies.items()
    ]

    ranked_records.sort(key=lambda record: (-record.frequency, record.skill))
    return ranked_records


def _collect_signal_skills(signal: ParsedMarketSignal) -> set[str]:
    """Collect normalized skill candidates from one parsed page/signal."""

    normalized: set[str] = set()

    for raw_item in [*signal.skills, *signal.tools]:
        canonical = _normalize_skill_name(raw_item)
        if canonical:
            normalized.add(canonical)

    searchable_text = _prepare_searchable_text(
        [signal.title, signal.raw_text, *signal.requirements, *signal.sections]
    )
    if searchable_text:
        padded = f" {searchable_text} "
        for alias, canonical in _ALIAS_TO_CANONICAL.items():
            if f" {alias} " in padded:
                normalized.add(canonical)

    return normalized


def _normalize_skill_name(value: str) -> str | None:
    """Normalize one raw extracted value into a canonical skill name."""

    normalized = _prepare_searchable_text([value])
    if not normalized:
        return None

    direct = _ALIAS_TO_CANONICAL.get(normalized)
    if direct:
        return direct

    squashed = normalized.replace(" ", "")
    if re.fullmatch(r"python\d+", squashed):
        return "Python"

    if normalized in {"rest api", "restful api", "rest apis", "restful apis"}:
        return "REST APIs"

    if normalized in {"ml", "machine learning"}:
        return "Machine Learning"

    fallback = _format_display_name(normalized)
    if not fallback:
        return None
    return fallback


def _categorize_skill(skill: str) -> str:
    direct = SKILL_CATEGORIES.get(skill)
    if direct:
        return direct

    lowered = skill.lower()
    if lowered in {"python", "javascript", "typescript", "sql", "java", "c++", "go"}:
        return "programming"
    if any(token in lowered for token in ("learning", "data", "nlp", "vision", "model")):
        return "AI / data"
    if any(token in lowered for token in ("aws", "azure", "gcp", "docker", "kubernetes", "devops")):
        return "cloud / devops"
    if any(token in lowered for token in ("api", "backend", "microservice", "database")):
        return "backend"
    if any(token in lowered for token in ("react", "frontend", "css", "html")):
        return "frontend"
    return "tooling"


def _prepare_searchable_text(parts: Sequence[str]) -> str:
    merged = " ".join(part.strip() for part in parts if part and part.strip())
    if not merged:
        return ""

    lowered = merged.lower()
    lowered = re.sub(r"[^a-z0-9+.#/\-\s]", " ", lowered)
    lowered = lowered.replace("/", " ")
    lowered = lowered.replace("-", " ")
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def _format_display_name(normalized: str) -> str | None:
    if not normalized or normalized.isdigit():
        return None

    acronym_overrides = {
        "api": "API",
        "apis": "APIs",
        "sql": "SQL",
        "aws": "AWS",
        "gcp": "GCP",
        "ci": "CI",
        "cd": "CD",
        "ml": "ML",
        "ai": "AI",
        "nlp": "NLP",
    }

    words = normalized.split()
    if len(words) > 5:
        return None

    display_words: list[str] = []
    for word in words:
        display_words.append(acronym_overrides.get(word, word.capitalize()))
    return " ".join(display_words)

"""Parsing stage for market intelligence.

Responsibility:
- extract skills, roles, requirements, and related job signals from text
- convert raw text payloads into typed semantic entities
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Sequence

from bs4 import BeautifulSoup

from .scraper import ScrapedDocument


logger = logging.getLogger(__name__)


NOISE_SELECTORS = (
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    "canvas",
    "nav",
    "footer",
    "header",
    "aside",
    "form",
)

REQUIREMENT_HEADING_TERMS = (
    "requirements",
    "minimum qualifications",
    "preferred qualifications",
    "qualifications",
    "what you will do",
    "responsibilities",
    "what we're looking for",
    "must have",
    "nice to have",
)

REQUIREMENT_LINE_TERMS = (
    "required",
    "requirement",
    "responsible",
    "responsibilities",
    "must",
    "minimum",
    "experience",
    "proficient",
    "proficiency",
    "knowledge of",
    "familiar with",
    "ability to",
    "qualification",
)

SKILL_KEYWORDS = (
    "machine learning",
    "deep learning",
    "data analysis",
    "data modeling",
    "software engineering",
    "system design",
    "cloud computing",
    "api development",
    "backend development",
    "frontend development",
    "testing",
    "debugging",
    "communication",
    "problem solving",
    "critical thinking",
    "leadership",
)

TOOL_KEYWORDS = (
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "fastapi",
    "flask",
    "django",
    "react",
    "node.js",
    "nodejs",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "pandas",
    "numpy",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "spark",
    "airflow",
    "git",
    "github",
)

BOILERPLATE_PATTERNS = (
    "privacy",
    "terms",
    "cookie",
    "all rights reserved",
    "sign in",
    "log in",
    "subscribe",
    "advertis",
)


@dataclass(slots=True)
class ParsedMarketSignal:
    """Structured parsing output extracted from one fetched page.

    Output shape aligns with the first-pass extraction contract:
    {
      "title": "...",
      "raw_text": "...",
      "skills": [...],
      "tools": [...],
      "sections": [...]
    }
    """

    source_url: str
    title: str = ""
    raw_text: str = ""
    skills: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    sections: list[str] = field(default_factory=list)
    requirements: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        """Return serializer-friendly structure for downstream usage."""

        return {
            "title": self.title,
            "raw_text": self.raw_text,
            "skills": self.skills,
            "tools": self.tools,
            "sections": self.sections,
        }


def parse_market_documents(documents: Sequence[ScrapedDocument]) -> Sequence[ParsedMarketSignal]:
    """Extract job- and skill-related entities from scraped documents.

    Args:
        documents: Raw HTML fetch outputs.

    Returns:
        A sequence of parsed market signals used by normalization.
    """

    parsed_results: list[ParsedMarketSignal] = []

    for document in documents:
        try:
            parsed_results.append(_parse_document(document))
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to parse document %s: %s", document.url, exc)
            parsed_results.append(
                ParsedMarketSignal(
                    source_url=document.url,
                    title=document.title,
                )
            )

    return parsed_results


def _parse_document(document: ScrapedDocument) -> ParsedMarketSignal:
    html = (document.body_text or "").strip()
    if not html:
        return ParsedMarketSignal(source_url=document.url, title=document.title)

    soup = BeautifulSoup(html, "html.parser")
    _remove_noise_nodes(soup)

    title = _extract_title(soup, fallback=document.title)
    visible_lines = _extract_visible_lines(soup)
    bullets = _extract_bullets(soup)
    sections = _extract_requirement_sections(soup)

    raw_text = "\n".join(_dedupe_preserve_order(visible_lines + bullets))
    requirements = _extract_requirement_lines(visible_lines + bullets + sections)

    full_text = "\n".join([raw_text] + sections)
    skills = _extract_keyword_mentions(full_text, SKILL_KEYWORDS)
    tools = _extract_keyword_mentions(full_text, TOOL_KEYWORDS)

    return ParsedMarketSignal(
        source_url=document.url,
        title=title,
        raw_text=raw_text,
        skills=skills,
        tools=tools,
        sections=sections,
        requirements=requirements,
    )


def _remove_noise_nodes(soup: BeautifulSoup) -> None:
    for selector in NOISE_SELECTORS:
        for node in soup.select(selector):
            node.decompose()


def _extract_title(soup: BeautifulSoup, *, fallback: str) -> str:
    if soup.title and soup.title.get_text(strip=True):
        return soup.title.get_text(strip=True)

    heading = soup.find(["h1", "h2"])
    if heading:
        heading_text = heading.get_text(" ", strip=True)
        if heading_text:
            return heading_text

    return fallback


def _extract_visible_lines(soup: BeautifulSoup) -> list[str]:
    text = soup.get_text("\n", strip=True)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    filtered = [line for line in lines if _is_relevant_line(line)]
    return filtered[:500]


def _extract_bullets(soup: BeautifulSoup) -> list[str]:
    bullets: list[str] = []
    for li in soup.find_all("li"):
        line = li.get_text(" ", strip=True)
        if not line:
            continue
        if not _is_relevant_line(line):
            continue
        bullets.append(line)
    return _dedupe_preserve_order(bullets)[:200]


def _extract_requirement_sections(soup: BeautifulSoup) -> list[str]:
    sections: list[str] = []

    for heading in soup.find_all(["h1", "h2", "h3", "h4", "strong"]):
        heading_text = heading.get_text(" ", strip=True)
        if not heading_text:
            continue

        heading_norm = heading_text.lower()
        if not any(term in heading_norm for term in REQUIREMENT_HEADING_TERMS):
            continue

        section_lines = [heading_text]
        for sibling in heading.find_next_siblings(limit=4):
            sibling_text = sibling.get_text(" ", strip=True)
            if not sibling_text:
                continue
            if not _is_relevant_line(sibling_text):
                continue
            section_lines.append(sibling_text)

        section_text = "\n".join(_dedupe_preserve_order(section_lines))
        if section_text:
            sections.append(section_text)

    return _dedupe_preserve_order(sections)[:30]


def _extract_requirement_lines(lines: Sequence[str]) -> list[str]:
    requirements: list[str] = []
    for line in lines:
        lowered = line.lower()
        if any(term in lowered for term in REQUIREMENT_LINE_TERMS):
            requirements.append(line)
    return _dedupe_preserve_order(requirements)[:120]


def _extract_keyword_mentions(text: str, keywords: Sequence[str]) -> list[str]:
    lowered = text.lower()
    found: list[str] = []

    for keyword in keywords:
        pattern = rf"\b{re.escape(keyword.lower())}\b"
        if re.search(pattern, lowered):
            found.append(keyword)

    return found


def _is_relevant_line(line: str) -> bool:
    normalized = " ".join(line.split()).strip().lower()
    if not normalized:
        return False
    if len(normalized) < 3:
        return False
    if len(normalized) > 450:
        return False
    if any(pattern in normalized for pattern in BOILERPLATE_PATTERNS):
        return False
    return True


def _dedupe_preserve_order(items: Sequence[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []

    for item in items:
        normalized = " ".join(item.split()).strip()
        key = normalized.lower()
        if not normalized or key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)

    return deduped

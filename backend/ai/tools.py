"""
tools.py — Callable tools for the SkillPulse AI agent
======================================================
Four tools that the LLM can invoke via OpenAI function-calling:

  1. tool_web_scrape      — live IT job data (BLS, Remotive, HN)
  2. tool_analyze_results — pandas-based insight extraction
  3. tool_generate_report — structured Markdown report formatter
  4. tool_generate_chart  — Matplotlib chart → base64 PNG

Each function returns a plain dict so the caller can safely
JSON-serialise it before sending it back to the model as a tool result.
"""

import base64
import io
import logging
from typing import Any

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — no display needed
import matplotlib.pyplot as plt
import pandas as pd

from scraper import scrape_it_jobs_data

logger = logging.getLogger("skillpulse-tools")


# ── Tool 1: Web Scraping ──────────────────────────────────────────────────────

def tool_web_scrape(query: str, per_source_limit: int = 5) -> dict:
    """
    Scrape live IT job-market data from three authoritative sources:
    BLS Occupational Outlook Handbook, Remotive.io, and HN 'Who is Hiring?'.

    Args:
        query:            Search keyword or career question.
        per_source_limit: Maximum results to collect per source (1–10).

    Returns:
        ``{"success": True, "count": N, "results": [...]}``
        Each result has ``title``, ``href``, and ``body`` keys.
    """
    try:
        raw = scrape_it_jobs_data(query, per_source_limit=per_source_limit)
        # Truncate body to keep tool results concise in the prompt window
        trimmed = [
            {"title": r["title"], "href": r["href"], "body": r["body"][:400]}
            for r in raw
        ]
        return {"success": True, "count": len(trimmed), "results": trimmed}
    except Exception as exc:
        logger.error("tool_web_scrape error: %s", exc)
        return {"success": False, "error": str(exc), "results": []}


# ── Tool 2: Analyze Results ───────────────────────────────────────────────────

def tool_analyze_results(data: list[dict], analysis_type: str = "frequency") -> dict:
    """
    Derive insights from scraped or skill data using pandas.

    analysis_type options:
      - ``frequency`` : count tech-keyword occurrences across all body text
      - ``gap``        : average gap_level by domain + top-5 critical gaps
      - ``trend``      : source distribution and total result count

    Args:
        data:          List of record dicts (e.g. scraped results or skill gaps).
        analysis_type: One of "frequency", "gap", or "trend".

    Returns:
        Dict with ``success`` flag and analysis-specific keys.
    """
    try:
        df = pd.DataFrame(data)
        if df.empty:
            return {"success": False, "error": "No data provided for analysis."}

        if analysis_type == "frequency":
            if "body" not in df.columns:
                return {"success": False, "error": "Data has no 'body' column for frequency analysis."}
            all_text = " ".join(df["body"].dropna().str.lower())
            tech_keywords = [
                "python", "javascript", "typescript", "java", "go", "rust",
                "react", "node", "docker", "kubernetes", "aws", "azure",
                "machine learning", "ai", "data", "sql", "devops", "cloud",
                "security", "linux", "git", "api",
            ]
            freq = {kw: all_text.count(kw) for kw in tech_keywords if all_text.count(kw) > 0}
            freq = dict(sorted(freq.items(), key=lambda x: x[1], reverse=True))
            return {
                "success": True,
                "analysis_type": "frequency",
                "keyword_frequency": freq,
                "total_documents": len(df),
            }

        if analysis_type == "gap":
            if "gap_level" not in df.columns or "domain" not in df.columns:
                return {"success": False, "error": "Data must have 'gap_level' and 'domain' columns."}
            df["gap_level"] = pd.to_numeric(df["gap_level"], errors="coerce").fillna(0)
            by_domain = df.groupby("domain")["gap_level"].mean().round(2).to_dict()
            top_gaps = (
                df.nlargest(5, "gap_level")[["skill_name", "domain", "gap_level", "reason"]]
                .to_dict(orient="records")
            )
            return {
                "success": True,
                "analysis_type": "gap",
                "average_gap_by_domain": by_domain,
                "top_5_critical_gaps": top_gaps,
            }

        if analysis_type == "trend":
            source_dist: dict[str, Any] = {}
            if "title" in df.columns:
                extracted = df["title"].str.extract(r"\[(.+?)\]")[0]
                source_dist = extracted.value_counts().to_dict()
            return {
                "success": True,
                "analysis_type": "trend",
                "source_distribution": source_dist,
                "total_results": len(df),
                "columns_available": list(df.columns),
            }

        # Fallback: generic summary
        return {
            "success": True,
            "analysis_type": analysis_type,
            "row_count": len(df),
            "columns": list(df.columns),
        }

    except Exception as exc:
        logger.error("tool_analyze_results error: %s", exc)
        return {"success": False, "error": str(exc)}


# ── Tool 3: Generate Report ───────────────────────────────────────────────────

def tool_generate_report(
    title: str,
    sections: list[dict],
    user_name: str = "User",
    target_role: str = "",
) -> dict:
    """
    Format analysis findings into a structured Markdown report.

    Args:
        title:       Document title (will be rendered as an H1 heading).
        sections:    List of ``{"heading": str, "content": str}`` dicts.
        user_name:   Name of the person the report is prepared for.
        target_role: Target job role to include in the header metadata.

    Returns:
        ``{"success": True, "report": "<markdown string>", "word_count": N}``
    """
    try:
        lines: list[str] = [f"# {title}", ""]

        if user_name != "User" or target_role:
            lines += [
                f"**Prepared for:** {user_name}",
                f"**Target Role:** {target_role}" if target_role else "",
                "",
            ]

        for section in sections:
            heading = section.get("heading", "Section")
            content = section.get("content", "")
            lines += [f"## {heading}", "", content, ""]

        report = "\n".join(line for line in lines if line is not None)
        return {
            "success": True,
            "report": report,
            "word_count": len(report.split()),
        }
    except Exception as exc:
        logger.error("tool_generate_report error: %s", exc)
        return {"success": False, "error": str(exc)}


# ── Tool 4: Generate Chart ────────────────────────────────────────────────────

_COLOR_MAPS: dict[str, Any] = {
    "viridis": plt.cm.viridis,
    "plasma": plt.cm.plasma,
    "coolwarm": plt.cm.coolwarm,
    "Blues": plt.cm.Blues,
}

# Dark-theme palette consistent with the SkillPulse dashboard
_BG_DARK = "#0f172a"
_PANEL_DARK = "#1e293b"
_BORDER_DARK = "#334155"
_TEXT_MUTED = "#94a3b8"
_TEXT_WHITE = "#f8fafc"
_ACCENT = "#38bdf8"


def tool_generate_chart(
    chart_type: str,
    labels: list[str],
    values: list[float],
    title: str = "Chart",
    x_label: str = "",
    y_label: str = "",
    color_scheme: str = "viridis",
) -> dict:
    """
    Render a data-visualisation chart and return it as a base64-encoded PNG.

    Supported chart types:
      - ``bar``            : vertical bar chart
      - ``horizontal_bar`` : horizontal bar chart (good for long labels)
      - ``pie``            : pie / donut chart
      - ``line``           : line chart with filled area

    The chart is styled with a dark theme that matches the SkillPulse UI.

    Args:
        chart_type:    One of "bar", "horizontal_bar", "pie", "line".
        labels:        Category labels (one per data point).
        values:        Numeric values (same length as labels).
        title:         Chart title displayed at the top.
        x_label:       Optional X-axis label.
        y_label:       Optional Y-axis label.
        color_scheme:  One of "viridis", "plasma", "coolwarm", "Blues".

    Returns:
        ``{"success": True, "image_base64": "<base64 PNG>", "mime_type": "image/png", ...}``
        or ``{"success": False, "error": "<message>"}``
    """
    if chart_type not in ("bar", "horizontal_bar", "pie", "line"):
        return {"success": False, "error": f"Unsupported chart_type: '{chart_type}'. Use bar, horizontal_bar, pie, or line."}

    if not labels or not values:
        return {"success": False, "error": "Both 'labels' and 'values' must be non-empty lists."}

    if len(labels) != len(values):
        return {"success": False, "error": f"'labels' ({len(labels)}) and 'values' ({len(values)}) must be the same length."}

    try:
        cmap = _COLOR_MAPS.get(color_scheme, plt.cm.viridis)
        n = max(len(labels) - 1, 1)
        colors = [cmap(i / n) for i in range(len(labels))]

        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor(_BG_DARK)
        ax.set_facecolor(_PANEL_DARK)

        if chart_type == "bar":
            bars = ax.bar(labels, values, color=colors, edgecolor=_BORDER_DARK, linewidth=0.8)
            ax.bar_label(bars, fmt="%.1f", padding=4, color=_TEXT_WHITE, fontsize=9)

        elif chart_type == "horizontal_bar":
            bars = ax.barh(labels, values, color=colors, edgecolor=_BORDER_DARK, linewidth=0.8)
            ax.bar_label(bars, fmt="%.1f", padding=4, color=_TEXT_WHITE, fontsize=9)

        elif chart_type == "pie":
            wedges, texts, autotexts = ax.pie(
                values,
                labels=labels,
                colors=colors,
                autopct="%1.1f%%",
                pctdistance=0.8,
                startangle=90,
            )
            for t in texts:
                t.set_color(_TEXT_MUTED)
            for at in autotexts:
                at.set_color(_TEXT_WHITE)
                at.set_fontsize(9)

        elif chart_type == "line":
            x_pos = range(len(labels))
            ax.plot(x_pos, values, color=_ACCENT, linewidth=2.5,
                    marker="o", markersize=6, markerfacecolor="#0ea5e9",
                    markeredgecolor=_BG_DARK, markeredgewidth=1.5)
            ax.fill_between(x_pos, values, alpha=0.12, color=_ACCENT)
            ax.set_xticks(list(x_pos))
            ax.set_xticklabels(
                labels,
                rotation=30 if len(labels) > 5 else 0,
                ha="right",
                color=_TEXT_MUTED,
                fontsize=9,
            )

        # Axes styling
        ax.set_title(title, color=_TEXT_WHITE, fontsize=14, fontweight="bold", pad=16)
        if x_label:
            ax.set_xlabel(x_label, color=_TEXT_MUTED, fontsize=11)
        if y_label:
            ax.set_ylabel(y_label, color=_TEXT_MUTED, fontsize=11)

        ax.tick_params(axis="both", colors=_TEXT_MUTED, labelsize=9)
        for spine in ax.spines.values():
            spine.set_edgecolor(_BORDER_DARK)

        # X-ticks for non-pie, non-line charts
        if chart_type in ("bar",):
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(
                labels,
                rotation=30 if len(labels) > 5 else 0,
                ha="right",
                color=_TEXT_MUTED,
                fontsize=9,
            )

        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode("utf-8")

        return {
            "success": True,
            "image_base64": img_b64,
            "mime_type": "image/png",
            "chart_type": chart_type,
            "title": title,
        }

    except Exception as exc:
        logger.error("tool_generate_chart error: %s", exc)
        plt.close("all")
        return {"success": False, "error": str(exc)}

import argparse
import json
import sys
import textwrap

# ── Section printer ──────────────────────────────────────────────────────────

_SEP = "=" * 72
_SUB = "-" * 72


def _heading(text: str) -> None:
    print(f"\n{_SEP}")
    print(f"  {text}")
    print(_SEP)


def _sub(text: str) -> None:
    print(f"\n  {text}")
    print(f"  {_SUB[2:]}")


def _paragraph(label: str, text: str, indent: int = 2) -> None:
    pad = " " * indent
    wrapped = textwrap.fill(
        str(text),
        width=72,
        initial_indent=f"{pad}{label}",
        subsequent_indent=" " * len(f"{pad}{label}"),
    )
    print(wrapped)


def _bullet(items: list, indent: int = 4) -> None:
    pad = " " * indent
    for item in items:
        wrapped = textwrap.fill(str(item), width=72, initial_indent=f"{pad}• ",
                                subsequent_indent=f"{pad}  ")
        print(wrapped)


def _task_table(tasks: list) -> None:
    if not tasks:
        return
    col_w = 46
    print(f"    {'Task':<{col_w}}  Time Estimate")
    print(f"    {'-'*col_w}  {'-'*20}")
    for t in tasks:
        # Tolerate plain strings (small-model quirk) as well as dicts
        if isinstance(t, str):
            task_text = t
            time_est  = "—"
        else:
            task_text = t.get("task", "—")
            time_est  = t.get("time_estimate", "—")
        # Wrap long task text
        lines = textwrap.wrap(task_text, col_w)
        print(f"    {lines[0]:<{col_w}}  {time_est}")
        for line in lines[1:]:
            print(f"    {line}")


def _comparison_report(report: dict) -> None:
    if not report:
        return

    introduction = report.get("introduction")
    if introduction:
        _paragraph("Introduction: ", introduction)

    for point in report.get("comparison_points", []):
        _sub(point.get("dimension", "Comparison Point"))
        analysis = point.get("analysis")
        if analysis:
            _paragraph("Analysis: ", analysis, indent=4)

    summary = report.get("summary")
    if summary:
        print()
        _paragraph("Summary: ", summary)


def _resolve_role(role: str | None) -> str:
    if role and role.strip():
        return role.strip()

    while True:
        user_role = input("Enter the IT job role to analyse: ").strip()
        if user_role:
            return user_role
        print("[ERROR] Please enter a non-empty IT job role.\n")


def print_result(data: dict, role: str, scraped_sources: int) -> None:
    """Pretty-print the full structured output."""

    print(f"\n{'#'*72}")
    print(f"  JOB DESCRIPTION ANALYSIS  —  Role: {role}")
    print(f"  Scraped sources used: {scraped_sources}")
    print(f"{'#'*72}")

    # ── 1. Job Description WITHOUT AI ────────────────────────────────────────
    jwa = data.get("job_without_ai") or {}
    _heading("1. JOB DESCRIPTION (without AI integration)")
    if jwa.get("title"):
        print(f"  Title      : {jwa.get('title')}")
    if jwa.get("description"):
        print()
        desc = textwrap.fill(jwa.get("description"), width=68,
                             initial_indent="  Description: ",
                             subsequent_indent="               ")
        print(desc)
    if jwa.get("tasks"):
        print()
        print("  Tasks & Time Estimates:")
        _task_table(jwa.get("tasks", []))

    # ── 2. Job Description WITH AI ────────────────────────────────────────────
    jwai = data.get("job_with_ai") or {}
    _heading("2. JOB DESCRIPTION (with AI integration)")
    if jwai.get("title"):
        print(f"  Title      : {jwai.get('title')}")
    if jwai.get("description"):
        print()
        desc2 = textwrap.fill(jwai.get("description"), width=68,
                              initial_indent="  Description: ",
                              subsequent_indent="               ")
        print(desc2)
    if jwai.get("tasks"):
        print()
        print("  Tasks & Time Estimates:")
        _task_table(jwai.get("tasks", []))

    # ── 3. Comparative Analysis Report ───────────────────────────────────────
    _heading("3. COMPARATIVE ANALYSIS REPORT")
    _comparison_report(data.get("comparative_analysis_report", {}))

    # ── 4. Skill Gaps ─────────────────────────────────────────────────────────
    _heading("4. SKILL GAPS IDENTIFICATION")
    _bullet(data.get("skill_gaps", []))

    # ── 5. Work Responsibility Transformations ────────────────────────────────
    _heading("5. POSSIBLE TRANSFORMATIONS IN WORK RESPONSIBILITIES")
    _bullet(data.get("work_responsibility_transformations", []))

    # ── 6. AI Integration Recommendations ────────────────────────────────────
    _heading("6. RECOMMENDATIONS FOR AI INTEGRATION")
    _bullet(data.get("ai_integration_recommendations", []))

    # ── 7. Workforce Development Strategies ──────────────────────────────────
    _heading("7. STRATEGIES FOR WORKFORCE DEVELOPMENT AND UPSKILLING")
    _bullet(data.get("workforce_development_strategies", []))

    # ── 8. Workforce Sustainability Impact ───────────────────────────────────
    _heading("8. IMPACT ON WORKFORCE SUSTAINABILITY")
    _bullet(data.get("workforce_sustainability_impact", []))

    # ── 9. Practical Advice for Teams ────────────────────────────────────────
    _heading("9. PRACTICAL ADVICE FOR TEAMS")
    _bullet(data.get("practical_advice_for_teams", []))

    print(f"\n{_SEP}\n")


# ── HTTP mode (default) ───────────────────────────────────────────────────────

def run_via_http(role: str, base_url: str = "http://localhost:8000") -> None:
    """Call the live FastAPI server and print the result."""
    try:
        import requests
    except ImportError:
        print("[ERROR] 'requests' is not installed. Run: pip install requests")
        sys.exit(1)

    url = f"{base_url}/generate-job-description"
    payload = {"role": role, "per_source_limit": 5}

    print(f"[INFO] POST {url}")
    print(f"[INFO] Payload: {json.dumps(payload)}")
    print("[INFO] Waiting for response (this may take 30-120 s with a local LLM)…\n")

    try:
        resp = requests.post(url, json=payload, timeout=300)
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to {base_url}.")
        print("        Start the server first:  python backend.py")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("[ERROR] Request timed out (300 s).")
        sys.exit(1)

    if resp.status_code == 400:
        print(f"[DOMAIN ERROR] {resp.json().get('detail', resp.text)}")
        sys.exit(1)

    if not resp.ok:
        print(f"[ERROR] HTTP {resp.status_code}: {resp.text}")
        sys.exit(1)

    body = resp.json()
    print_result(body["data"], body["role"], body.get("scraped_sources", 0))


# ── Direct / in-process mode ──────────────────────────────────────────────────

def run_direct(role: str) -> None:
    """
    Import the FastAPI app and call the endpoint in-process.
    No running server required — useful for quick local testing.
    """
    import asyncio
    import os

    # Ensure the ai/ directory is on the path so backend.py can import scraper
    ai_dir = os.path.dirname(os.path.abspath(__file__))
    if ai_dir not in sys.path:
        sys.path.insert(0, ai_dir)

    from backend import generate_job_description, JobDescriptionRequest  # noqa

    req = JobDescriptionRequest(role=role, per_source_limit=5)

    print(f"[INFO] Running in-process (no server needed).")
    print(f"[INFO] Role: {role!r}")
    print("[INFO] Scraping live IT data and querying LLM — please wait…\n")

    try:
        resp = asyncio.run(generate_job_description(req))
    except Exception as exc:
        print(f"[ERROR] {exc}")
        sys.exit(1)

    print_result(resp["data"], resp["role"], resp.get("scraped_sources", 0))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Test /generate-job-description with a terminal-provided IT role."
    )
    parser.add_argument(
        "--role",
        default=None,
        help="IT job role to analyse. If omitted, the script prompts in the terminal.",
    )
    parser.add_argument(
        "--direct",
        action="store_true",
        help="Run in-process (import backend directly, no HTTP server needed)",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the running FastAPI server (default: http://localhost:8000)",
    )
    args = parser.parse_args()
    role = _resolve_role(args.role)

    if args.direct:
        run_direct(role)
    else:
        run_via_http(role, base_url=args.url)

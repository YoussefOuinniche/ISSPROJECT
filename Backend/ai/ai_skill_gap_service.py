from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai_skill_gap_models import (
    AISkillGapAnalysisRequest,
    AISkillGapAnalysisResponse,
    MissingSkillItem,
    PartialGapItem,
    SkillGapAnalysisMeta,
    SkillGapRecommendation,
    StrengthItem,
)


LEVEL_RANK = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}
PRIORITY_RANK = {"high": 3, "medium": 2, "low": 1}


@dataclass(frozen=True, slots=True)
class SkillRequirement:
    name: str
    target_level: str
    priority: str
    category: str
    why_it_matters: str
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class RoleDefinition:
    key: str
    display_name: str
    aliases: tuple[str, ...]
    requirements: tuple[SkillRequirement, ...]


class AISkillGapServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def req(
    name: str,
    target_level: str,
    priority: str,
    category: str,
    why_it_matters: str,
    *aliases: str,
) -> SkillRequirement:
    return SkillRequirement(
        name=name,
        target_level=target_level,
        priority=priority,
        category=category,
        why_it_matters=why_it_matters,
        aliases=tuple(aliases),
    )


ROLE_DEFINITIONS: tuple[RoleDefinition, ...] = (
    RoleDefinition(
        key="frontend_engineer",
        display_name="Frontend Engineer",
        aliases=("frontend engineer", "front end engineer", "frontend developer"),
        requirements=(
            req("HTML/CSS", "advanced", "high", "Frontend", "Required for semantic, responsive UI work.", "html", "css", "tailwind"),
            req("JavaScript / TypeScript", "advanced", "high", "Frontend", "Needed for client-side application logic.", "javascript", "typescript", "js", "ts"),
            req("React", "advanced", "high", "Frameworks", "A common framework for component-driven apps.", "react", "next.js", "nextjs"),
            req("API Integration", "intermediate", "high", "Integration", "Frontend teams need to consume APIs cleanly.", "api", "rest", "graphql", "react query"),
            req("Testing", "intermediate", "medium", "Quality", "UI changes need regression protection.", "jest", "vitest", "cypress", "playwright"),
            req("Accessibility", "intermediate", "medium", "Quality", "Production UIs must be accessible.", "a11y", "aria", "wcag"),
        ),
    ),
    RoleDefinition(
        key="backend_engineer",
        display_name="Backend Engineer",
        aliases=("backend engineer", "back end engineer", "backend developer"),
        requirements=(
            req("API Development", "advanced", "high", "Backend", "Backends expose stable service contracts.", "api", "rest", "graphql"),
            req("Backend Frameworks", "advanced", "high", "Frameworks", "Framework fluency is needed for routing and validation.", "express", "fastapi", "django", "flask", "nestjs"),
            req("SQL / Databases", "advanced", "high", "Data", "Most backends depend on durable data modeling and querying.", "sql", "postgresql", "mysql", "database", "supabase"),
            req("Authentication & Authorization", "intermediate", "high", "Security", "Backend APIs must protect user access and data.", "auth", "jwt", "oauth", "authorization"),
            req("Testing", "intermediate", "medium", "Quality", "Services need contract and integration confidence.", "pytest", "jest", "integration testing"),
            req("Cloud Deployment", "intermediate", "medium", "Operations", "Backend code needs deploy and runtime literacy.", "docker", "aws", "azure", "gcp"),
        ),
    ),
    RoleDefinition(
        key="full_stack_engineer",
        display_name="Full Stack Engineer",
        aliases=("full stack engineer", "fullstack engineer", "full stack developer"),
        requirements=(
            req("JavaScript / TypeScript", "advanced", "high", "Core", "A strong shared language simplifies cross-stack delivery.", "javascript", "typescript", "js", "ts"),
            req("React", "advanced", "high", "Frontend", "Modern product delivery usually includes a UI framework.", "react", "next.js", "nextjs"),
            req("API Development", "advanced", "high", "Backend", "Full stack work depends on service design and consumption.", "api", "rest", "graphql"),
            req("SQL / Databases", "intermediate", "high", "Data", "Most products need data storage and querying skills.", "sql", "postgresql", "mysql", "database"),
            req("Testing", "intermediate", "medium", "Quality", "Cross-stack delivery breaks easily without tests.", "jest", "playwright", "cypress", "pytest"),
            req("Cloud Deployment", "intermediate", "medium", "Operations", "Shipping full stack work requires deployment basics.", "docker", "vercel", "aws", "azure", "gcp"),
        ),
    ),
    RoleDefinition(
        key="mobile_engineer",
        display_name="Mobile Engineer",
        aliases=("mobile engineer", "mobile developer", "react native developer"),
        requirements=(
            req("Mobile Development", "advanced", "high", "Mobile", "The role depends on strong mobile platform or framework fluency.", "react native", "swift", "swiftui", "kotlin", "android", "ios"),
            req("API Integration", "advanced", "high", "Integration", "Mobile apps need reliable API and offline/error handling.", "api", "rest", "graphql"),
            req("State Management", "intermediate", "medium", "Architecture", "Navigation and async UX need coordinated state.", "redux", "zustand", "context api"),
            req("Testing", "intermediate", "medium", "Quality", "Mobile releases need confidence across flows.", "jest", "detox", "maestro", "appium"),
            req("Performance Optimization", "intermediate", "medium", "Quality", "Mobile UX is sensitive to rendering and startup cost.", "performance", "optimization", "profiling"),
        ),
    ),
    RoleDefinition(
        key="devops_engineer",
        display_name="DevOps Engineer",
        aliases=("devops engineer", "devops", "site reliability engineer", "sre"),
        requirements=(
            req("Linux", "advanced", "high", "Systems", "Production operations depend on Linux troubleshooting.", "linux", "bash", "shell"),
            req("Docker", "advanced", "high", "Containers", "Containers are a standard packaging/runtime layer.", "docker", "container"),
            req("CI/CD", "advanced", "high", "Delivery", "The role automates build, test, and release pipelines.", "ci/cd", "github actions", "gitlab ci", "jenkins"),
            req("Kubernetes", "advanced", "high", "Containers", "Common orchestration layer for production workloads.", "kubernetes", "k8s", "helm"),
            req("Infrastructure as Code", "advanced", "high", "Automation", "Infra changes should be reproducible and reviewable.", "terraform", "pulumi", "cloudformation"),
            req("Observability", "intermediate", "medium", "Reliability", "Teams need monitoring and logging to run systems safely.", "grafana", "prometheus", "datadog", "monitoring"),
        ),
    ),
    RoleDefinition(
        key="cloud_engineer",
        display_name="Cloud Engineer",
        aliases=("cloud engineer", "cloud architect", "cloud developer"),
        requirements=(
            req("Cloud Platforms", "advanced", "high", "Cloud", "Core cloud service literacy is required.", "aws", "azure", "gcp", "cloud"),
            req("Infrastructure as Code", "advanced", "high", "Automation", "Cloud environments should be provisioned through code.", "terraform", "pulumi", "cloudformation"),
            req("Networking", "intermediate", "high", "Networking", "Cloud systems depend on VPC, routing, and DNS basics.", "networking", "vpc", "dns", "load balancer"),
            req("Security / IAM", "intermediate", "high", "Security", "Identity and least-privilege access are fundamental.", "iam", "identity", "security"),
            req("Containers", "intermediate", "medium", "Compute", "Many cloud platforms run containerized workloads.", "docker", "kubernetes", "container"),
            req("Monitoring", "intermediate", "medium", "Operations", "Cloud systems need operational visibility.", "monitoring", "cloudwatch", "datadog", "grafana"),
        ),
    ),
    RoleDefinition(
        key="platform_engineer",
        display_name="Platform Engineer",
        aliases=("platform engineer", "developer platform engineer"),
        requirements=(
            req("Cloud Platforms", "advanced", "high", "Platform", "Platform engineering usually sits on cloud foundations.", "aws", "azure", "gcp", "cloud"),
            req("Kubernetes", "advanced", "high", "Platform", "Often used to standardize runtime and delivery paths.", "kubernetes", "k8s", "helm"),
            req("Infrastructure as Code", "advanced", "high", "Automation", "Reusable platform layers require IaC.", "terraform", "pulumi", "cloudformation"),
            req("CI/CD", "advanced", "high", "Delivery", "Platform teams automate golden delivery paths.", "ci/cd", "github actions", "gitlab ci", "jenkins"),
            req("Observability", "intermediate", "medium", "Reliability", "Shared platforms need good telemetry and debugging.", "monitoring", "grafana", "prometheus", "logging"),
            req("Developer Experience Tooling", "intermediate", "medium", "Platform", "Platform value comes from paved roads for developers.", "backstage", "developer portal", "developer experience"),
        ),
    ),
    RoleDefinition(
        key="data_analyst",
        display_name="Data Analyst",
        aliases=("data analyst", "analytics analyst", "business analyst"),
        requirements=(
            req("SQL", "advanced", "high", "Analysis", "Analysts need SQL to retrieve and validate business data.", "sql", "postgresql", "mysql", "bigquery"),
            req("Data Visualization", "advanced", "high", "Communication", "Insights must be presented clearly to stakeholders.", "tableau", "power bi", "looker", "dashboard", "visualization"),
            req("Statistics", "intermediate", "high", "Analysis", "Statistical basics prevent weak conclusions.", "statistics", "hypothesis testing"),
            req("Stakeholder Communication", "intermediate", "high", "Communication", "Analyst output needs clear written and spoken communication.", "communication", "storytelling", "presentation"),
            req("Experiment Analysis", "intermediate", "medium", "Analysis", "A/B test literacy matters for product and growth decisions.", "a/b testing", "experimentation", "ab testing"),
            req("Python", "intermediate", "low", "Analysis", "Python extends analysis and automation depth.", "python", "pandas"),
        ),
    ),
    RoleDefinition(
        key="data_engineer",
        display_name="Data Engineer",
        aliases=("data engineer", "analytics engineer"),
        requirements=(
            req("SQL", "advanced", "high", "Data", "Warehouse and transformation work depends on strong SQL.", "sql", "postgresql", "mysql", "bigquery", "snowflake"),
            req("Python", "advanced", "high", "Data", "Python is widely used for pipeline logic and tooling.", "python", "pyspark"),
            req("Data Pipelines", "advanced", "high", "Pipelines", "The role centers on building reliable pipelines.", "etl", "elt", "data pipeline", "pipeline"),
            req("Data Warehousing", "advanced", "high", "Warehousing", "Warehouse modeling is core to downstream analytics.", "warehouse", "snowflake", "bigquery", "redshift", "dbt"),
            req("Orchestration", "intermediate", "medium", "Operations", "Production pipelines need scheduling and recovery control.", "airflow", "dagster", "prefect", "orchestration"),
            req("Distributed Processing", "intermediate", "medium", "Scale", "Large data workloads often require distributed compute.", "spark", "pyspark", "databricks"),
        ),
    ),
    RoleDefinition(
        key="data_scientist",
        display_name="Data Scientist",
        aliases=("data scientist",),
        requirements=(
            req("Python", "advanced", "high", "Data Science", "Python is the default language for modeling and experimentation.", "python", "pandas", "numpy"),
            req("SQL", "advanced", "high", "Data Science", "Data scientists still need direct access to source data.", "sql", "postgresql", "mysql", "bigquery"),
            req("Statistics", "advanced", "high", "Methods", "Strong statistical reasoning is essential for trustworthy inference.", "statistics", "hypothesis testing"),
            req("Machine Learning", "advanced", "high", "Modeling", "The role depends on model selection, training, and evaluation.", "machine learning", "ml", "scikit-learn", "sklearn"),
            req("Data Visualization", "intermediate", "medium", "Communication", "Models must be explained visually and clearly.", "matplotlib", "seaborn", "plotly", "visualization"),
            req("Experiment Design", "intermediate", "medium", "Methods", "Experiments help validate decisions and assumptions.", "experiment design", "a/b testing", "experimentation"),
        ),
    ),
    RoleDefinition(
        key="machine_learning_engineer",
        display_name="Machine Learning Engineer",
        aliases=("machine learning engineer", "ml engineer"),
        requirements=(
            req("Python", "advanced", "high", "ML", "Production ML stacks are heavily Python-centered.", "python", "pandas", "numpy"),
            req("Machine Learning", "advanced", "high", "ML", "The role requires strong model training and evaluation fundamentals.", "machine learning", "ml", "scikit-learn", "sklearn"),
            req("Deep Learning", "intermediate", "medium", "ML", "Many ML roles need neural-network fluency.", "deep learning", "pytorch", "tensorflow"),
            req("Model Deployment", "advanced", "high", "Production", "ML engineers must turn experiments into reliable services.", "serving", "inference", "deployment", "model deployment"),
            req("Data Pipelines", "intermediate", "medium", "Data", "Feature and training pipelines are part of production ML.", "etl", "feature pipeline", "pipeline"),
            req("MLOps / Evaluation", "intermediate", "medium", "Production", "Production ML needs tracking, monitoring, and evaluation.", "mlops", "evaluation", "model monitoring", "experiment tracking"),
        ),
    ),
    RoleDefinition(
        key="ai_engineer",
        display_name="AI Engineer",
        aliases=("ai engineer", "llm engineer", "generative ai engineer", "genai engineer"),
        requirements=(
            req("Python", "advanced", "high", "AI", "Most AI engineering stacks depend on Python tooling.", "python", "fastapi", "flask"),
            req("Machine Learning", "intermediate", "high", "AI", "Core ML concepts help with model choice and tradeoffs.", "machine learning", "ml", "scikit-learn", "sklearn"),
            req("LLM / Prompt Engineering", "advanced", "high", "LLM Apps", "AI product work needs prompt design, retrieval, and output control.", "llm", "prompt engineering", "rag", "openai", "ollama"),
            req("Model Deployment", "intermediate", "high", "Production", "AI features need deployable services and guardrails.", "serving", "inference", "deployment", "model deployment"),
            req("API Integration", "intermediate", "medium", "Integration", "AI systems usually sit behind APIs and existing products.", "api", "rest", "graphql"),
            req("Evaluation / MLOps", "intermediate", "medium", "Quality", "AI systems need evaluation, monitoring, and version control.", "evaluation", "mlops", "monitoring", "experiment tracking"),
        ),
    ),
    RoleDefinition(
        key="mlops_engineer",
        display_name="MLOps Engineer",
        aliases=("mlops engineer", "machine learning operations engineer"),
        requirements=(
            req("Python", "advanced", "high", "MLOps", "Automation and model tooling in MLOps are commonly built in Python.", "python"),
            req("Docker", "advanced", "high", "Containers", "Containerized model workloads are standard in production ML.", "docker", "container"),
            req("Kubernetes", "advanced", "high", "Containers", "MLOps platforms often rely on Kubernetes.", "kubernetes", "k8s", "helm"),
            req("CI/CD", "advanced", "high", "Delivery", "Reliable model delivery depends on automated pipelines.", "ci/cd", "github actions", "gitlab ci", "jenkins"),
            req("Model Deployment", "advanced", "high", "Production", "MLOps owns the path from model artifact to serving.", "model deployment", "serving", "inference"),
            req("Model Monitoring", "intermediate", "medium", "Reliability", "Production ML needs drift and quality monitoring.", "monitoring", "model monitoring", "drift detection"),
        ),
    ),
    RoleDefinition(
        key="cybersecurity_analyst",
        display_name="Cybersecurity Analyst",
        aliases=("cybersecurity analyst", "security analyst", "soc analyst"),
        requirements=(
            req("Networking", "advanced", "high", "Security", "Security analysis depends on understanding network behavior.", "networking", "tcp/ip", "dns"),
            req("Security Monitoring", "advanced", "high", "Security", "Analysts need to detect suspicious patterns across logs and telemetry.", "security monitoring", "siem", "splunk", "sentinel"),
            req("Incident Response", "advanced", "high", "Security", "The role requires structured investigation and containment workflows.", "incident response", "triage", "containment"),
            req("Vulnerability Management", "intermediate", "high", "Security", "Analysts prioritize and track vulnerability remediation.", "vulnerability management", "vulnerability scanning", "cve"),
            req("Identity & Access Management", "intermediate", "medium", "Security", "Identity abuse is a common attack path.", "iam", "identity", "access management"),
            req("Cloud Security", "intermediate", "medium", "Security", "A large share of modern security work touches cloud systems.", "cloud security", "aws", "azure", "gcp"),
        ),
    ),
    RoleDefinition(
        key="qa_automation_engineer",
        display_name="QA Automation Engineer",
        aliases=("qa automation engineer", "automation qa engineer", "test automation engineer"),
        requirements=(
            req("Test Automation", "advanced", "high", "Quality", "The role is centered on automating regression and release confidence.", "test automation", "automation testing", "selenium", "playwright", "cypress"),
            req("API Testing", "advanced", "high", "Quality", "QA automation often extends beyond UI into service testing.", "api testing", "postman", "contract testing"),
            req("UI Testing", "advanced", "high", "Quality", "Stable UI automation is expected for end-to-end confidence.", "ui testing", "selenium", "playwright", "cypress"),
            req("Programming / Scripting", "intermediate", "medium", "Engineering", "Automation engineers need coding fluency to maintain suites.", "javascript", "typescript", "python", "java"),
            req("CI/CD", "intermediate", "medium", "Delivery", "Automated tests need to run consistently in pipelines.", "ci/cd", "github actions", "gitlab ci", "jenkins"),
            req("Bug Analysis", "intermediate", "medium", "Quality", "Effective QA work requires precise debugging and defect isolation.", "debugging", "bug analysis", "defect triage"),
        ),
    ),
    RoleDefinition(
        key="product_manager",
        display_name="Product Manager",
        aliases=("product manager", "pm"),
        requirements=(
            req("Product Discovery", "advanced", "high", "Product", "PMs need discovery skills to validate problems before building.", "product discovery", "discovery"),
            req("Roadmapping", "advanced", "high", "Product", "Roadmapping turns strategy into sequenced delivery.", "roadmap", "roadmapping", "planning"),
            req("Prioritization", "advanced", "high", "Product", "PMs need clear prioritization to allocate capacity well.", "prioritization", "backlog management"),
            req("Analytics", "intermediate", "medium", "Insights", "Data-informed decision making is core to product management.", "analytics", "sql", "amplitude", "mixpanel"),
            req("User Research", "intermediate", "medium", "Insights", "Research helps PMs understand users and opportunity size.", "user research", "interviews", "research"),
            req("Technical Communication", "intermediate", "high", "Leadership", "PMs must align engineering, design, and stakeholders.", "communication", "stakeholder management", "spec writing"),
        ),
    ),
    RoleDefinition(
        key="technical_project_manager",
        display_name="Technical Project Manager",
        aliases=("technical project manager", "program manager", "delivery manager"),
        requirements=(
            req("Delivery Planning", "advanced", "high", "Execution", "Technical project managers coordinate scope and schedule.", "delivery planning", "project planning", "planning"),
            req("Agile Program Management", "advanced", "high", "Execution", "TPMs need strong execution frameworks for iterative delivery.", "agile", "scrum", "kanban", "program management"),
            req("Risk Management", "advanced", "high", "Execution", "Complex delivery depends on managing risks early.", "risk management", "risk tracking"),
            req("Technical Communication", "advanced", "high", "Leadership", "TPMs translate between technical detail and stakeholder outcomes.", "communication", "stakeholder management", "status reporting"),
            req("Metrics / Reporting", "intermediate", "medium", "Execution", "Delivery health requires reliable reporting.", "reporting", "metrics", "dashboard"),
            req("Process Improvement", "intermediate", "medium", "Execution", "TPMs improve the system around delivery, not only the schedule.", "process improvement", "continuous improvement"),
        ),
    ),
)

ROLE_LOOKUP = {
    alias.casefold(): role
    for role in ROLE_DEFINITIONS
    for alias in (role.display_name, *role.aliases)
}


def _normalize_text(value: Any) -> str:
    lowered = str(value or "").strip().casefold()
    chars: list[str] = []
    previous_space = False
    for char in lowered:
        if char.isalnum():
            chars.append(char)
            previous_space = False
            continue
        if not previous_space:
            chars.append(" ")
            previous_space = True
    return "".join(chars).strip()


def _normalize_level(value: Any) -> str:
    level = _normalize_text(value)
    if level in LEVEL_RANK:
        return level
    return "beginner"


def _normalize_string(value: Any) -> str:
    return str(value or "").strip()


def _max_level(left: str, right: str) -> str:
    return left if LEVEL_RANK[left] >= LEVEL_RANK[right] else right


def _matches_alias(skill_name: str, alias: str) -> bool:
    normalized_skill = _normalize_text(skill_name)
    normalized_alias = _normalize_text(alias)
    if not normalized_skill or not normalized_alias:
        return False
    if normalized_skill == normalized_alias:
        return True
    return (
        normalized_skill.startswith(normalized_alias + " ")
        or normalized_skill.endswith(" " + normalized_alias)
        or f" {normalized_alias} " in f" {normalized_skill} "
        or normalized_alias.startswith(normalized_skill + " ")
    )


def _extract_skill_name(record: dict[str, Any]) -> str:
    return _normalize_string(
        record.get("name")
        or record.get("skill_name")
        or record.get("skill")
        or record.get("title")
    )


def _extract_skill_level(record: dict[str, Any]) -> str:
    level = _normalize_level(record.get("level") or record.get("proficiency_level"))
    if level != "beginner":
        return level

    years = record.get("years_of_experience")
    try:
        numeric_years = float(years)
    except (TypeError, ValueError):
        return level

    if numeric_years >= 5:
        return "advanced"
    if numeric_years >= 2:
        return "intermediate"
    return "beginner"


def _dedupe_skills(skills: list[dict[str, str]]) -> list[dict[str, str]]:
    deduped: dict[str, dict[str, str]] = {}
    for skill in skills:
        name = _normalize_string(skill.get("name"))
        if not name:
            continue
        key = _normalize_text(name)
        level = _normalize_level(skill.get("level"))
        existing = deduped.get(key)
        if existing is None:
            deduped[key] = {"name": name, "level": level}
            continue
        deduped[key] = {"name": existing["name"], "level": _max_level(existing["level"], level)}
    return list(deduped.values())


def _extract_skill_sources(
    profile: dict[str, Any],
) -> tuple[list[dict[str, str]], list[dict[str, str]], list[dict[str, str]]]:
    explicit_profile = profile.get("explicit_profile")
    ai_profile = profile.get("ai_profile")
    current_skills = profile.get("current_skills")

    explicit_rows = explicit_profile.get("skills", []) if isinstance(explicit_profile, dict) else []
    ai_rows = ai_profile.get("skills", []) if isinstance(ai_profile, dict) else []
    current_rows = current_skills if isinstance(current_skills, list) else []

    def build(items: list[Any]) -> list[dict[str, str]]:
        return _dedupe_skills(
            [
                {"name": _extract_skill_name(item), "level": _extract_skill_level(item)}
                for item in items
                if isinstance(item, dict) and _extract_skill_name(item)
            ]
        )

    return build(explicit_rows), build(ai_rows), build(current_rows)


def _build_current_skill_map(profile: dict[str, Any]) -> tuple[dict[str, dict[str, str]], int, int]:
    explicit_skills, ai_skills, current_skill_rows = _extract_skill_sources(profile)
    current_skill_map: dict[str, dict[str, str]] = {}

    for source_group in (ai_skills, current_skill_rows, explicit_skills):
        for skill in source_group:
            key = _normalize_text(skill["name"])
            if key not in current_skill_map:
                current_skill_map[key] = dict(skill)
                continue
            current_skill_map[key]["level"] = _max_level(current_skill_map[key]["level"], skill["level"])

    return current_skill_map, len(explicit_skills), len(ai_skills)


def _find_matching_skill(
    current_skill_map: dict[str, dict[str, str]],
    requirement: SkillRequirement,
) -> dict[str, str] | None:
    candidate_aliases = (requirement.name, *requirement.aliases)
    for skill in current_skill_map.values():
        for alias in candidate_aliases:
            if _matches_alias(skill["name"], alias):
                return skill
    return None


def _resolve_role_definition(target_role: str) -> RoleDefinition | None:
    normalized_target = _normalize_text(target_role)
    if not normalized_target:
        return None

    direct_match = ROLE_LOOKUP.get(normalized_target)
    if direct_match is not None:
        return direct_match

    heuristics = (
        ("frontend", "frontend_engineer"),
        ("backend", "backend_engineer"),
        ("full stack", "full_stack_engineer"),
        ("fullstack", "full_stack_engineer"),
        ("mobile", "mobile_engineer"),
        ("devops", "devops_engineer"),
        ("cloud", "cloud_engineer"),
        ("platform", "platform_engineer"),
        ("data analyst", "data_analyst"),
        ("data engineer", "data_engineer"),
        ("data scientist", "data_scientist"),
        ("machine learning", "machine_learning_engineer"),
        ("mlops", "mlops_engineer"),
        (" ai ", "ai_engineer"),
        ("llm", "ai_engineer"),
        ("security", "cybersecurity_analyst"),
        ("cyber", "cybersecurity_analyst"),
        ("qa", "qa_automation_engineer"),
        ("product manager", "product_manager"),
        ("project manager", "technical_project_manager"),
    )
    by_key = {role.key: role for role in ROLE_DEFINITIONS}
    wrapped = f" {normalized_target} "
    for token, role_key in heuristics:
        if token in wrapped:
            return by_key[role_key]
    return None


def _missing_gap_severity(priority: str) -> str:
    if priority == "high":
        return "critical"
    if priority == "medium":
        return "moderate"
    return "minor"


def _partial_gap_severity(priority: str, current_level: str, target_level: str) -> str:
    level_diff = max(0, LEVEL_RANK[target_level] - LEVEL_RANK[current_level])
    if priority == "high" and level_diff >= 2:
        return "critical"
    if priority == "high" or level_diff >= 2 or (priority == "medium" and level_diff >= 1):
        return "moderate"
    return "minor"


def _sort_strengths(values: list[StrengthItem]) -> list[StrengthItem]:
    return sorted(
        values,
        key=lambda item: (-LEVEL_RANK[item.target_level], -LEVEL_RANK[item.current_level], item.skill.casefold()),
    )


def _sort_gaps(values: list[MissingSkillItem | PartialGapItem]) -> list[MissingSkillItem | PartialGapItem]:
    severity_rank = {"critical": 3, "moderate": 2, "minor": 1}
    return sorted(
        values,
        key=lambda item: (-PRIORITY_RANK[item.priority], -severity_rank[item.gap_severity], item.skill.casefold()),
    )


def _build_recommendations(
    target_role: str,
    missing_skills: list[MissingSkillItem],
    partial_gaps: list[PartialGapItem],
) -> list[SkillGapRecommendation]:
    recommendations: list[SkillGapRecommendation] = []
    seen_titles: set[str] = set()

    for gap in [*missing_skills[:2], *partial_gaps[:2]]:
        title = f"Close the {gap.skill} gap"
        key = title.casefold()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        recommendations.append(
            SkillGapRecommendation(
                title=title,
                priority=gap.priority,
                action=(
                    f"Use one focused project or workflow in the context of {target_role} "
                    f"to reach {getattr(gap, 'target_level', 'intermediate')} proficiency in {gap.skill}."
                ),
                reason=gap.why_it_matters,
            )
        )

    if missing_skills:
        recommendations.append(
            SkillGapRecommendation(
                title=f"Sequence your learning for {target_role}",
                priority="medium",
                action="Start with the high-priority missing skills, then raise partial gaps that still block delivery quality.",
                reason="A staged plan avoids spending time on lower-impact work before the core blockers are addressed.",
            )
        )

    return recommendations[:5]


@dataclass(slots=True)
class AISkillGapService:
    async def handle_analysis(
        self,
        payload: AISkillGapAnalysisRequest,
    ) -> AISkillGapAnalysisResponse:
        profile = payload.profile if isinstance(payload.profile, dict) else {}
        role = _resolve_role_definition(payload.target_role)
        if role is None:
            raise AISkillGapServiceError(
                422,
                "The requested target role is not supported by the SkillPulse role taxonomy.",
            )

        current_skill_map, explicit_skill_count, ai_skill_count = _build_current_skill_map(profile)
        strengths: list[StrengthItem] = []
        missing_skills: list[MissingSkillItem] = []
        partial_gaps: list[PartialGapItem] = []

        for requirement in role.requirements:
            current_skill = _find_matching_skill(current_skill_map, requirement)
            if current_skill is None:
                missing_skills.append(
                    MissingSkillItem(
                        skill=requirement.name,
                        target_level=requirement.target_level,
                        priority=requirement.priority,
                        gap_severity=_missing_gap_severity(requirement.priority),
                        why_it_matters=requirement.why_it_matters,
                        category=requirement.category,
                    )
                )
                continue

            current_level = current_skill["level"]
            if LEVEL_RANK[current_level] >= LEVEL_RANK[requirement.target_level]:
                strengths.append(
                    StrengthItem(
                        skill=requirement.name,
                        current_level=current_level,
                        target_level=requirement.target_level,
                        why_it_matters=requirement.why_it_matters,
                        category=requirement.category,
                    )
                )
                continue

            partial_gaps.append(
                PartialGapItem(
                    skill=requirement.name,
                    current_level=current_level,
                    target_level=requirement.target_level,
                    priority=requirement.priority,
                    gap_severity=_partial_gap_severity(requirement.priority, current_level, requirement.target_level),
                    why_it_matters=requirement.why_it_matters,
                    category=requirement.category,
                )
            )

        sorted_strengths = _sort_strengths(strengths)[:6]
        sorted_missing = _sort_gaps(missing_skills)[:8]
        sorted_partial = _sort_gaps(partial_gaps)[:8]

        return AISkillGapAnalysisResponse(
            target_role=role.display_name,
            strengths=sorted_strengths,
            missing_skills=sorted_missing,
            partial_gaps=sorted_partial,
            recommendations=_build_recommendations(role.display_name, sorted_missing, sorted_partial),
            meta=SkillGapAnalysisMeta(
                matched_role_key=role.key,
                current_skill_count=len(current_skill_map),
                explicit_skill_count=explicit_skill_count,
                ai_skill_count=ai_skill_count,
            ),
        )

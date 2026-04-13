from __future__ import annotations

from dataclasses import dataclass

from ai_roadmap_models import (
    AIRoadmapGenerateRequest,
    AIRoadmapGenerateResponse,
    RoadmapStage,
    RoadmapVisualizationStage,
    VisualizationDatum,
    VisualizationPayload,
)
from ai_skill_gap_service import (
    LEVEL_RANK,
    PRIORITY_RANK,
    RoleDefinition,
    SkillRequirement,
    _build_current_skill_map,
    _find_matching_skill,
    _resolve_role_definition,
)


FOUNDATION_CATEGORIES = {
    "frontend",
    "backend",
    "core",
    "ai",
    "ml",
    "data",
    "data science",
    "mobile",
    "systems",
    "analysis",
    "methods",
    "product",
    "execution",
    "security",
    "cloud",
}

BUILD_CATEGORIES = {
    "frameworks",
    "integration",
    "architecture",
    "pipelines",
    "warehousing",
    "llm apps",
    "modeling",
    "platform",
    "communication",
    "delivery",
}

ROLE_TOOLS = {
    "frontend_engineer": ["HTML", "CSS", "TypeScript", "React", "Next.js", "React Query", "Playwright"],
    "backend_engineer": ["TypeScript", "Express", "FastAPI", "PostgreSQL", "JWT", "Docker", "Pytest"],
    "full_stack_engineer": ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Playwright", "Docker"],
    "mobile_engineer": ["React Native", "Expo", "TypeScript", "REST APIs", "Zustand", "Detox", "EAS"],
    "devops_engineer": ["Linux", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Prometheus", "Grafana"],
    "cloud_engineer": ["AWS", "Azure", "GCP", "Terraform", "Docker", "IAM", "CloudWatch"],
    "platform_engineer": ["Kubernetes", "Terraform", "GitHub Actions", "Backstage", "Prometheus", "Grafana"],
    "data_analyst": ["SQL", "Tableau", "Power BI", "Excel", "A/B Testing", "Python"],
    "data_engineer": ["SQL", "Python", "dbt", "Airflow", "Spark", "BigQuery", "Snowflake"],
    "data_scientist": ["Python", "SQL", "Pandas", "NumPy", "scikit-learn", "Matplotlib"],
    "machine_learning_engineer": ["Python", "PyTorch", "TensorFlow", "scikit-learn", "MLflow", "Docker"],
    "ai_engineer": ["Python", "FastAPI", "OpenAI", "Ollama", "Vector Database", "Prompt Evaluation", "Docker"],
    "mlops_engineer": ["Python", "Docker", "Kubernetes", "GitHub Actions", "MLflow", "Prometheus"],
    "cybersecurity_analyst": ["SIEM", "Splunk", "Sentinel", "IAM", "Network Analysis", "Cloud Security"],
    "qa_automation_engineer": ["Playwright", "Cypress", "Postman", "GitHub Actions", "TypeScript", "Selenium"],
    "product_manager": ["Product Discovery", "Roadmapping", "Analytics", "SQL", "Mixpanel", "User Research"],
    "technical_project_manager": ["Roadmaps", "Risk Registers", "Agile Delivery", "Dashboards", "Status Reporting"],
}

ROADMAP_STAGE_COLORS = ("#2BE6F6", "#3E8CFF", "#6E7BFF")


class AIRoadmapServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _stage_index(requirement: SkillRequirement) -> int:
    category = requirement.category.casefold()
    if category in FOUNDATION_CATEGORIES:
        return 0
    if category in BUILD_CATEGORIES:
        return 1
    return 2


def _requirement_sort_key(requirement: SkillRequirement) -> tuple[int, int, int, str]:
    return (
        _stage_index(requirement),
        -PRIORITY_RANK.get(requirement.priority, 2),
        -LEVEL_RANK.get(requirement.target_level, 2),
        requirement.name.casefold(),
    )


def _format_item(requirement: SkillRequirement, current_skill: dict[str, str] | None) -> str:
    if current_skill is None:
        return (
            f"Learn {requirement.name} to a {requirement.target_level} level. "
            f"{requirement.why_it_matters}"
        )

    current_level = current_skill["level"]
    if LEVEL_RANK[current_level] < LEVEL_RANK[requirement.target_level]:
        return (
            f"Raise {requirement.name} from {current_level} to {requirement.target_level}. "
            f"{requirement.why_it_matters}"
        )

    return (
        f"Apply {requirement.name} in a production-style build so it becomes part of your repeatable workflow. "
        f"{requirement.why_it_matters}"
    )


def _build_stage_projects(role: RoleDefinition, stage_title: str, requirements: list[SkillRequirement]) -> list[str]:
    names = [requirement.name for requirement in requirements[:3]]
    if not names:
        return []

    if stage_title == "Foundations":
        return [
            f"Build a small {role.display_name.lower()} fundamentals project focused on {', '.join(names[:2])}.",
            f"Document the concepts, decisions, and tradeoffs you learned while practicing {names[0]}.",
        ]

    if stage_title == "Build & Ship":
        return [
            f"Ship a scoped {role.display_name.lower()} project that combines {', '.join(names)}.",
            f"Add one real-world workflow around {names[0]} so the project looks like production work instead of a tutorial.",
        ]

    return [
        f"Harden your {role.display_name.lower()} project with {', '.join(names[:2])} and write an architecture note for the final system.",
        f"Create a case study explaining how {names[0]} and {names[-1]} improve delivery quality or reliability.",
    ]


def _build_final_projects(role: RoleDefinition, sorted_requirements: list[SkillRequirement]) -> list[str]:
    top_names = [requirement.name for requirement in sorted_requirements[:4]]
    secondary_names = [requirement.name for requirement in sorted_requirements[4:7]]

    first_focus = ", ".join(top_names[:3]) if top_names else role.display_name
    second_focus = ", ".join(secondary_names[:3]) if secondary_names else first_focus

    return [
        f"Portfolio capstone: build an end-to-end {role.display_name.lower()} project that demonstrates {first_focus}.",
        f"Production case study: extend the capstone with reliability, testing, and delivery workflows centered on {second_focus}.",
    ]


def _build_visualization(role: RoleDefinition, stages: list[RoadmapStage]) -> VisualizationPayload:
    return VisualizationPayload(
        type="roadmap",
        title=f"{role.display_name} roadmap",
        data=[
            VisualizationDatum(
                label=stage.title,
                value=float(len(stage.items)),
                items=stage.items[:4],
                color=ROADMAP_STAGE_COLORS[index % len(ROADMAP_STAGE_COLORS)],
            )
            for index, stage in enumerate(stages)
        ],
        stages=[
            RoadmapVisualizationStage(
                title=stage.title,
                items=stage.items,
            )
            for stage in stages
        ],
    )


def _group_requirements(
    role: RoleDefinition,
    current_skill_map: dict[str, dict[str, str]],
) -> list[RoadmapStage]:
    grouped: dict[int, list[tuple[SkillRequirement, dict[str, str] | None]]] = {0: [], 1: [], 2: []}

    for requirement in sorted(role.requirements, key=_requirement_sort_key):
        grouped[_stage_index(requirement)].append((requirement, _find_matching_skill(current_skill_map, requirement)))

    stage_titles = ("Foundations", "Build & Ship", "Advanced & Production")
    stages: list[RoadmapStage] = []

    for index, title in enumerate(stage_titles):
        pairs = grouped.get(index, [])
        if not pairs:
            continue

        requirements = [requirement for requirement, _ in pairs]
        items = [_format_item(requirement, current_skill) for requirement, current_skill in pairs[:5]]
        projects = _build_stage_projects(role, title, requirements)
        stages.append(RoadmapStage(title=title, items=items, projects=projects))

    return stages


@dataclass(slots=True)
class AIRoadmapService:
    async def handle_generate(
        self,
        payload: AIRoadmapGenerateRequest,
    ) -> AIRoadmapGenerateResponse:
        role = _resolve_role_definition(payload.role)
        if role is None:
            raise AIRoadmapServiceError(
                422,
                "The requested role is not supported by the SkillPulse roadmap taxonomy.",
            )

        profile = payload.user_profile if isinstance(payload.user_profile, dict) else {}
        current_skill_map, _, _ = _build_current_skill_map(profile)
        sorted_requirements = sorted(role.requirements, key=_requirement_sort_key)
        stages = _group_requirements(role, current_skill_map)

        return AIRoadmapGenerateResponse(
            role=role.display_name,
            stages=stages,
            tools=ROLE_TOOLS.get(role.key, [requirement.name for requirement in sorted_requirements[:7]]),
            final_projects=_build_final_projects(role, sorted_requirements),
            visualization=_build_visualization(role, stages),
        )

import type { RoleRoadmap } from "@/constants/roleRoadmaps";
import type { VisualRoadmap, VisualRoadmapConnection, VisualRoadmapNode } from "@/lib/roadmap/roadmapTypes";
import { sanitizeVisualRoadmap } from "@/lib/roadmap/roadmapValidation";

const CANVAS_WIDTH = 1120;
const SECTION_X = 560;
const LEFT_X = 260;
const RIGHT_X = 860;
const TOP_Y = 180;
const STAGE_STEP_Y = 310;
const SKILL_STEP_Y = 88;
const NODE_TIME_FALLBACK = "1-2 weeks";

type RoadmapStageLike = {
  title: string;
  items: string[];
  projects?: string[];
  duration?: string;
  objective?: string;
};

type VisualCapableRoadmap = {
  id?: unknown;
  title?: unknown;
  role?: unknown;
  summary?: unknown;
  source?: unknown;
  relatedRoadmaps?: unknown;
  nodes?: unknown;
  connections?: unknown;
  stages?: unknown;
  tools?: unknown;
  final_projects?: unknown;
  visualization?: unknown;
  data?: unknown;
  roadmap_title?: unknown;
  phases?: unknown;
  total_months?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((item) => {
    const text = asTrimmedString(item);
    if (!text) return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(text);
  });

  return normalized;
}

function normalizeStageList(value: unknown): RoadmapStageLike[] {
  if (!Array.isArray(value)) return [];

  const stages: RoadmapStageLike[] = [];

  value.forEach((item) => {
    const record = asRecord(item);
    const title = asTrimmedString(record.title);
    if (!title) return;

    stages.push({
      title,
      items: uniqueStrings(record.items ?? record.skills ?? record.tasks),
      projects: uniqueStrings(record.projects ?? record.resources),
      duration: asTrimmedString(record.duration),
      objective: asTrimmedString(record.objective),
    });
  });

  return stages;
}

function buildStageNode(
  roadmapId: string,
  role: string,
  stage: RoadmapStageLike,
  stageIndex: number,
  totalStages: number,
  toolSummary?: string
): VisualRoadmapNode {
  const yOffset = totalStages <= 1 ? 0 : stageIndex * STAGE_STEP_Y;
  const descriptionParts = [stage.objective, stage.duration].filter(Boolean);
  const explanationParts = [toolSummary, ...(stage.projects || []).slice(0, 1)].filter(Boolean);

  return {
    id: `${roadmapId}-section-${stageIndex + 1}-${slugify(stage.title) || "stage"}`,
    title: stage.title,
    type: "section",
    x: SECTION_X,
    y: TOP_Y + yOffset,
    description: descriptionParts.join(" • ") || `${role} stage ${stageIndex + 1}`,
    explanation: explanationParts.join(" • ") || undefined,
    estimatedTime: stage.duration || undefined,
  };
}

function buildSkillNodes(
  roadmapId: string,
  sectionNode: VisualRoadmapNode,
  stage: RoadmapStageLike
): VisualRoadmapNode[] {
  const items = uniqueStrings([...(stage.items || []), ...(stage.projects || [])]);

  return items.map((item, itemIndex) => {
    const isLeft = itemIndex % 2 === 0;
    const columnIndex = Math.floor(itemIndex / 2);
    const skillId = slugify(item) || `item-${itemIndex + 1}`;

    return {
      id: `${roadmapId}-skill-${sectionNode.id}-${skillId}`,
      title: item,
      type: "skill",
      x: isLeft ? LEFT_X : RIGHT_X,
      y: sectionNode.y - 48 + columnIndex * SKILL_STEP_Y,
      description: stage.objective || undefined,
      parent: sectionNode.id,
      explanation: stage.duration || undefined,
      whyItMatters: stage.objective || undefined,
      projectIdea: (stage.projects || []).includes(item) ? item : stage.projects?.[0],
      estimatedTime: stage.duration || NODE_TIME_FALLBACK,
    };
  });
}

function buildVisualGraph(
  roadmapId: string,
  role: string,
  stages: RoadmapStageLike[],
  options?: {
    toolSummary?: string;
  }
): Pick<VisualRoadmap, "nodes" | "connections"> {
  const nodes: VisualRoadmapNode[] = [];
  const connections: VisualRoadmapConnection[] = [];
  let previousSectionId: string | null = null;

  stages.forEach((stage, stageIndex) => {
    const sectionNode = buildStageNode(
      roadmapId,
      role,
      stage,
      stageIndex,
      stages.length,
      options?.toolSummary
    );
    nodes.push(sectionNode);

    if (previousSectionId) {
      connections.push({
        from: previousSectionId,
        to: sectionNode.id,
        type: "solid",
      });
    }

    const skillNodes = buildSkillNodes(roadmapId, sectionNode, stage);
    skillNodes.forEach((node) => {
      nodes.push(node);
      connections.push({
        from: sectionNode.id,
        to: node.id,
        type: "dotted",
      });
    });

    previousSectionId = sectionNode.id;
  });

  return { nodes, connections };
}

function buildMockSummary(roleRoadmap: RoleRoadmap): string {
  return [
    `${roleRoadmap.stages.length} stages`,
    roleRoadmap.totalDuration,
    `${roleRoadmap.tools.length} tools`,
  ].join(" • ");
}

function buildAiSummary(
  role: string,
  stages: RoadmapStageLike[],
  tools: string[],
  finalProjects: string[]
): string {
  const summaryParts = [
    `${stages.length} stages`,
    tools.length > 0 ? `${tools.length} tools` : "",
    finalProjects.length > 0 ? `${finalProjects.length} capstones` : "",
  ].filter(Boolean);

  return summaryParts.join(" • ") || `AI roadmap for ${role}.`;
}

function unwrapAiRoadmap(value: unknown): Record<string, unknown> {
  const record = asRecord(value) as VisualCapableRoadmap;
  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }
  return record as Record<string, unknown>;
}

export function roleRoadmapToVisualRoadmap(roleRoadmap: RoleRoadmap): VisualRoadmap {
  const roadmapId = slugify(roleRoadmap.id || roleRoadmap.role) || "roadmap";
  const stages = roleRoadmap.stages.map((stage) => ({
    title: stage.title,
    items: uniqueStrings(stage.skills),
    projects: uniqueStrings(stage.outcomes),
    duration: stage.duration,
    objective: stage.objective,
  }));

  const graph = buildVisualGraph(roadmapId, roleRoadmap.role, stages, {
    toolSummary: roleRoadmap.tools.slice(0, 4).join(", "),
  });

  return sanitizeVisualRoadmap({
    id: roadmapId,
    title: `${roleRoadmap.role} roadmap`,
    role: roleRoadmap.role,
    summary: buildMockSummary(roleRoadmap),
    source: "mock",
    relatedRoadmaps: [],
    nodes: graph.nodes,
    connections: graph.connections,
  });
}

export function aiRoadmapToVisualRoadmap(
  aiRoadmap: unknown,
  fallbackRole?: string
): VisualRoadmap {
  const root = unwrapAiRoadmap(aiRoadmap);
  const directNodes = Array.isArray(root.nodes) ? root.nodes : [];
  const directConnections = Array.isArray(root.connections) ? root.connections : [];

  if (directNodes.length > 0) {
    return sanitizeVisualRoadmap({
      id: asTrimmedString(root.id) || slugify(asTrimmedString(root.role) || fallbackRole || "ai-roadmap"),
      title:
        asTrimmedString(root.title) ||
        `${asTrimmedString(root.role) || fallbackRole || "AI"} roadmap`,
      role: asTrimmedString(root.role) || fallbackRole || "AI roadmap",
      summary:
        asTrimmedString(root.summary) ||
        `AI roadmap with ${directNodes.length} nodes.`,
      source: "ai",
      relatedRoadmaps: root.relatedRoadmaps,
      nodes: directNodes,
      connections: directConnections,
    });
  }

  const visualization = asRecord(root.visualization);
  if (Array.isArray(visualization.nodes) && visualization.nodes.length > 0) {
    return sanitizeVisualRoadmap({
      id:
        asTrimmedString(root.id) ||
        slugify(asTrimmedString(root.role) || fallbackRole || "ai-roadmap"),
      title:
        asTrimmedString(root.title) ||
        asTrimmedString(visualization.title) ||
        `${asTrimmedString(root.role) || fallbackRole || "AI"} roadmap`,
      role: asTrimmedString(root.role) || fallbackRole || "AI roadmap",
      summary:
        asTrimmedString(root.summary) ||
        `AI roadmap with ${visualization.nodes.length} visual nodes.`,
      source: "ai",
      relatedRoadmaps: root.relatedRoadmaps,
      nodes: visualization.nodes,
      connections: visualization.connections,
    });
  }

  const role =
    asTrimmedString(root.role) ||
    asTrimmedString(root.roadmap_title) ||
    fallbackRole ||
    "AI roadmap";
  const roadmapId = slugify(asTrimmedString(root.id) || role) || "ai-roadmap";
  const stages = normalizeStageList(root.stages ?? root.phases ?? visualization.stages);
  const tools = uniqueStrings(root.tools);
  const finalProjects = uniqueStrings(root.final_projects);

  const normalizedStages =
    stages.length > 0
      ? stages
      : [
          {
            title: "Foundations",
            items: tools.slice(0, 4),
            projects: finalProjects.slice(0, 1),
          },
          {
            title: "Build & Apply",
            items: tools.slice(4, 8),
            projects: finalProjects.slice(1, 2),
          },
        ].filter((stage) => stage.items.length > 0 || (stage.projects || []).length > 0);

  const graph = buildVisualGraph(roadmapId, role, normalizedStages, {
    toolSummary: tools.slice(0, 5).join(", "),
  });

  return sanitizeVisualRoadmap({
    id: roadmapId,
    title:
      asTrimmedString(root.title) ||
      asTrimmedString(visualization.title) ||
      `${role} roadmap`,
    role,
    summary:
      asTrimmedString(root.summary) ||
      buildAiSummary(role, normalizedStages, tools, finalProjects),
    source: "ai",
    relatedRoadmaps: root.relatedRoadmaps,
    nodes: graph.nodes,
    connections: graph.connections,
  });
}

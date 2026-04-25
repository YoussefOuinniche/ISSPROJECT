import type {
  VisualRoadmap,
  VisualRoadmapConnection,
  VisualRoadmapNode,
} from "@/lib/roadmap/roadmapTypes";

const DEFAULT_CANVAS_WIDTH = 1120;
const DEFAULT_CANVAS_MARGIN = 120;
const DEFAULT_Y_STEP = 140;
const DEFAULT_BOARD_MIN_WIDTH = 860;
const DEFAULT_BOARD_MIN_HEIGHT = 680;
const LAYOUT_EDGE_PADDING = 64;
const OVERLAP_PADDING = 18;

const BOARD_CENTER_X = 560;
const SKILL_COL_GAP = 36;
const SKILL_ROW_GAP = 28;
const SECTION_TO_SKILLS_GAP = 32;
const SECTION_CLUSTER_GAP = 72;
const MAX_SKILL_COLUMNS = 4;

export const ROADMAP_SECTION_NODE_SIZE = {
  width: 220,
  height: 100,
} as const;

export const ROADMAP_SKILL_NODE_SIZE = {
  width: 164,
  height: 76,
} as const;

type RoadmapBounds = {
  minLeft: number;
  minTop: number;
  maxRight: number;
  maxBottom: number;
  width: number;
  height: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeNodeType(value: unknown): VisualRoadmapNode["type"] {
  const normalized = asTrimmedString(value).toLowerCase();
  if (normalized === "section" || normalized === "stage" || normalized === "phase") {
    return "section";
  }
  return "skill";
}

function normalizeConnectionType(value: unknown): VisualRoadmapConnection["type"] {
  const normalized = asTrimmedString(value).toLowerCase();
  if (normalized === "solid" || normalized === "line" || normalized === "primary") {
    return "solid";
  }
  return "dotted";
}

function normalizeCoordinate(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

function normalizeOptionalText(value: unknown): string | undefined {
  const text = asTrimmedString(value);
  return text || undefined;
}

function normalizeRelatedRoadmaps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const related: string[] = [];

  value.forEach((item) => {
    const text = asTrimmedString(item).toLowerCase();
    if (!text || seen.has(text)) return;
    seen.add(text);
    related.push(text);
  });

  return related;
}

export function getVisualRoadmapNodeSize(
  type: VisualRoadmapNode["type"]
): typeof ROADMAP_SECTION_NODE_SIZE | typeof ROADMAP_SKILL_NODE_SIZE {
  return type === "section" ? ROADMAP_SECTION_NODE_SIZE : ROADMAP_SKILL_NODE_SIZE;
}

function normalizeNodes(value: unknown): VisualRoadmapNode[] {
  if (!Array.isArray(value)) return [];

  const usedIds = new Set<string>();
  const nodes: VisualRoadmapNode[] = [];

  value.forEach((item, index) => {
    const record = asRecord(item);
    const title = asTrimmedString(record.title);
    if (!title) return;

    const baseId =
      asTrimmedString(record.id).toLowerCase() || `node-${slugify(title) || index + 1}`;

    let id = slugify(baseId) || `node-${index + 1}`;
    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    usedIds.add(id);

    nodes.push({
      id,
      title,
      type: normalizeNodeType(record.type),
      x: normalizeCoordinate(record.x, DEFAULT_CANVAS_WIDTH / 2),
      y: normalizeCoordinate(record.y, DEFAULT_CANVAS_MARGIN + index * DEFAULT_Y_STEP),
      description: normalizeOptionalText(record.description),
      parent: normalizeOptionalText(record.parent) || null,
      explanation: normalizeOptionalText(record.explanation),
      whyItMatters: normalizeOptionalText(record.whyItMatters),
      projectIdea: normalizeOptionalText(record.projectIdea),
      estimatedTime: normalizeOptionalText(record.estimatedTime),
    });
  });

  return nodes;
}

function normalizeConnections(value: unknown): VisualRoadmapConnection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      const from = slugify(asTrimmedString(record.from));
      const to = slugify(asTrimmedString(record.to));
      if (!from || !to) return null;

      return {
        from,
        to,
        type: normalizeConnectionType(record.type),
      } satisfies VisualRoadmapConnection;
    })
    .filter((item): item is VisualRoadmapConnection => Boolean(item));
}

function getNodeBounds(node: VisualRoadmapNode) {
  const size = getVisualRoadmapNodeSize(node.type);
  return {
    left: node.x - size.width / 2,
    top: node.y - size.height / 2,
    right: node.x + size.width / 2,
    bottom: node.y + size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function measureRoadmapBounds(nodes: VisualRoadmapNode[]): RoadmapBounds {
  if (nodes.length === 0) {
    return {
      minLeft: 0,
      minTop: 0,
      maxRight: DEFAULT_BOARD_MIN_WIDTH,
      maxBottom: DEFAULT_BOARD_MIN_HEIGHT,
      width: DEFAULT_BOARD_MIN_WIDTH,
      height: DEFAULT_BOARD_MIN_HEIGHT,
    };
  }

  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    const bounds = getNodeBounds(node);
    minLeft = Math.min(minLeft, bounds.left);
    minTop = Math.min(minTop, bounds.top);
    maxRight = Math.max(maxRight, bounds.right);
    maxBottom = Math.max(maxBottom, bounds.bottom);
  });

  return {
    minLeft,
    minTop,
    maxRight,
    maxBottom,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}

function boxesOverlap(first: VisualRoadmapNode, second: VisualRoadmapNode) {
  const a = getNodeBounds(first);
  const b = getNodeBounds(second);

  return !(
    a.right + OVERLAP_PADDING <= b.left ||
    b.right + OVERLAP_PADDING <= a.left ||
    a.bottom + OVERLAP_PADDING <= b.top ||
    b.bottom + OVERLAP_PADDING <= a.top
  );
}

function countNodeOverlaps(nodes: VisualRoadmapNode[]) {
  let overlaps = 0;

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (boxesOverlap(nodes[i], nodes[j])) {
        overlaps += 1;
      }
    }
  }

  return overlaps;
}

function getSectionNodes(roadmap: VisualRoadmap) {
  return roadmap.nodes.filter((node) => node.type === "section");
}

function sortNodesByVisualOrder(nodes: VisualRoadmapNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.y !== right.y) return left.y - right.y;
    if (left.x !== right.x) return left.x - right.x;
    return left.title.localeCompare(right.title);
  });
}

function getOrderedSectionIds(roadmap: VisualRoadmap) {
  const sections = sortNodesByVisualOrder(getSectionNodes(roadmap));
  const sectionIds = new Set(sections.map((section) => section.id));
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  sections.forEach((section) => {
    adjacency.set(section.id, []);
    indegree.set(section.id, 0);
  });

  roadmap.connections.forEach((connection) => {
    if (
      connection.type !== "solid" ||
      !sectionIds.has(connection.from) ||
      !sectionIds.has(connection.to)
    ) {
      return;
    }

    adjacency.get(connection.from)?.push(connection.to);
    indegree.set(connection.to, (indegree.get(connection.to) || 0) + 1);
  });

  const queue = sections
    .filter((section) => (indegree.get(section.id) || 0) === 0)
    .map((section) => section.id);
  const ordered: string[] = [];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const nextId = queue.shift();
    if (!nextId || seen.has(nextId)) continue;
    seen.add(nextId);
    ordered.push(nextId);

    const outgoing = adjacency.get(nextId) || [];
    outgoing
      .sort((leftId, rightId) => {
        const leftNode = sections.find((section) => section.id === leftId);
        const rightNode = sections.find((section) => section.id === rightId);
        return (leftNode?.y || 0) - (rightNode?.y || 0);
      })
      .forEach((targetId) => {
        indegree.set(targetId, Math.max(0, (indegree.get(targetId) || 0) - 1));
        if ((indegree.get(targetId) || 0) === 0) {
          queue.push(targetId);
        }
      });
  }

  sections.forEach((section) => {
    if (!seen.has(section.id)) {
      ordered.push(section.id);
    }
  });

  return ordered;
}

function getSkillAssignments(roadmap: VisualRoadmap, sectionIds: string[]) {
  const nodeMap = new Map(roadmap.nodes.map((node) => [node.id, node]));
  const skillNodes = roadmap.nodes.filter((node) => node.type === "skill");
  const assignments = new Map<string, VisualRoadmapNode[]>();
  const usedSkillIds = new Set<string>();

  sectionIds.forEach((sectionId) => {
    assignments.set(sectionId, []);
  });

  const pushSkill = (sectionId: string, skill: VisualRoadmapNode) => {
    const list = assignments.get(sectionId);
    if (!list || usedSkillIds.has(skill.id)) return;
    list.push(skill);
    usedSkillIds.add(skill.id);
  };

  skillNodes.forEach((skill) => {
    if (skill.parent && assignments.has(skill.parent)) {
      pushSkill(skill.parent, skill);
    }
  });

  roadmap.connections.forEach((connection) => {
    const fromNode = nodeMap.get(connection.from);
    const toNode = nodeMap.get(connection.to);
    if (!fromNode || !toNode) return;

    if (fromNode.type === "section" && toNode.type === "skill" && assignments.has(fromNode.id)) {
      pushSkill(fromNode.id, toNode);
    }

    if (toNode.type === "section" && fromNode.type === "skill" && assignments.has(toNode.id)) {
      pushSkill(toNode.id, fromNode);
    }
  });

  const orderedSections = sectionIds
    .map((sectionId) => nodeMap.get(sectionId))
    .filter((node): node is VisualRoadmapNode => Boolean(node));

  skillNodes.forEach((skill) => {
    if (usedSkillIds.has(skill.id) || orderedSections.length === 0) return;

    const nearestSection = orderedSections.reduce((closest, candidate) => {
      if (!closest) return candidate;
      return Math.abs(skill.y - candidate.y) < Math.abs(skill.y - closest.y) ? candidate : closest;
    }, orderedSections[0]);

    pushSkill(nearestSection.id, skill);
  });

  assignments.forEach((skills, sectionId) => {
    assignments.set(sectionId, sortNodesByVisualOrder(skills));
  });

  return assignments;
}

function columnsFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return count;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return MAX_SKILL_COLUMNS;
}

function reflowSectionRoadmap(roadmap: VisualRoadmap): VisualRoadmap {
  const nodeMap = new Map(roadmap.nodes.map((node) => [node.id, node]));
  const sectionIds = getOrderedSectionIds(roadmap);
  const assignments = getSkillAssignments(roadmap, sectionIds);
  const positioned = new Map<string, VisualRoadmapNode>();

  const COL_W = ROADMAP_SKILL_NODE_SIZE.width + SKILL_COL_GAP;
  const ROW_H = ROADMAP_SKILL_NODE_SIZE.height + SKILL_ROW_GAP;

  let currentTop = DEFAULT_CANVAS_MARGIN;

  sectionIds.forEach((sectionId) => {
    const section = nodeMap.get(sectionId);
    if (!section) return;

    const skills = assignments.get(sectionId) || [];
    const cols = columnsFor(skills.length);
    const rows = cols > 0 ? Math.ceil(skills.length / cols) : 0;

    const sectionY = currentTop + ROADMAP_SECTION_NODE_SIZE.height / 2;
    positioned.set(section.id, {
      ...section,
      x: BOARD_CENTER_X,
      y: sectionY,
    });

    if (skills.length > 0 && cols > 0) {
      const gridWidth = cols * COL_W - SKILL_COL_GAP;
      const gridLeftCenter =
        BOARD_CENTER_X - gridWidth / 2 + ROADMAP_SKILL_NODE_SIZE.width / 2;
      const gridTopCenter =
        sectionY +
        ROADMAP_SECTION_NODE_SIZE.height / 2 +
        SECTION_TO_SKILLS_GAP +
        ROADMAP_SKILL_NODE_SIZE.height / 2;

      skills.forEach((skill, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        positioned.set(skill.id, {
          ...skill,
          x: gridLeftCenter + col * COL_W,
          y: gridTopCenter + row * ROW_H,
          parent: skill.parent || section.id,
        });
      });
    }

    const skillsBlockHeight =
      rows > 0 ? SECTION_TO_SKILLS_GAP + rows * ROW_H - SKILL_ROW_GAP : 0;
    const clusterHeight = ROADMAP_SECTION_NODE_SIZE.height + skillsBlockHeight;
    currentTop += clusterHeight + SECTION_CLUSTER_GAP;
  });

  const orphans = roadmap.nodes.filter((node) => !positioned.has(node.id));
  if (orphans.length > 0) {
    const cols = Math.min(MAX_SKILL_COLUMNS, Math.max(1, orphans.length));
    const gridWidth = cols * COL_W - SKILL_COL_GAP;
    const gridLeftCenter =
      BOARD_CENTER_X - gridWidth / 2 + ROADMAP_SKILL_NODE_SIZE.width / 2;
    const gridTopCenter = currentTop + ROADMAP_SKILL_NODE_SIZE.height / 2;

    orphans.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positioned.set(node.id, {
        ...node,
        x: gridLeftCenter + col * COL_W,
        y: gridTopCenter + row * ROW_H,
      });
    });
  }

  return {
    ...roadmap,
    nodes: roadmap.nodes.map((node) => positioned.get(node.id) || node),
  };
}

function reflowFlatRoadmap(roadmap: VisualRoadmap): VisualRoadmap {
  const count = roadmap.nodes.length;
  if (count === 0) return roadmap;

  const COL_W = ROADMAP_SKILL_NODE_SIZE.width + SKILL_COL_GAP;
  const ROW_H = ROADMAP_SKILL_NODE_SIZE.height + SKILL_ROW_GAP;
  const cols = Math.min(
    MAX_SKILL_COLUMNS,
    Math.max(1, Math.ceil(Math.sqrt(count * 1.4)))
  );
  const gridWidth = cols * COL_W - SKILL_COL_GAP;
  const gridLeftCenter =
    BOARD_CENTER_X - gridWidth / 2 + ROADMAP_SKILL_NODE_SIZE.width / 2;
  const gridTopCenter = DEFAULT_CANVAS_MARGIN + ROADMAP_SKILL_NODE_SIZE.height / 2;

  return {
    ...roadmap,
    nodes: roadmap.nodes.map((node, index) => ({
      ...node,
      x: gridLeftCenter + (index % cols) * COL_W,
      y: gridTopCenter + Math.floor(index / cols) * ROW_H,
    })),
  };
}

function shouldReflowRoadmap(roadmap: VisualRoadmap) {
  if (roadmap.nodes.length <= 1) {
    return false;
  }

  const bounds = measureRoadmapBounds(roadmap.nodes);
  const sections = sortNodesByVisualOrder(getSectionNodes(roadmap));
  const overlaps = countNodeOverlaps(roadmap.nodes);
  const hasUnsafeEdges =
    bounds.minLeft < LAYOUT_EDGE_PADDING ||
    bounds.minTop < LAYOUT_EDGE_PADDING ||
    bounds.width < 560 ||
    bounds.height < 360;
  const hasCompressedSections = sections.some((section, index) => {
    if (index === 0) return false;
    const previous = sections[index - 1];
    return section.y - previous.y < ROADMAP_SECTION_NODE_SIZE.height + 100;
  });

  return (
    overlaps > 0 ||
    hasUnsafeEdges ||
    hasCompressedSections ||
    bounds.width > DEFAULT_CANVAS_WIDTH * 1.6 ||
    bounds.height > DEFAULT_CANVAS_WIDTH * 1.8
  );
}

function normalizeRoadmapLayout(roadmap: VisualRoadmap): VisualRoadmap {
  const hasSections = roadmap.nodes.some((node) => node.type === "section");
  const needsReflow = shouldReflowRoadmap(roadmap);

  if (!needsReflow) {
    return {
      ...roadmap,
      nodes: roadmap.nodes.map((node) => ({
        ...node,
        x: normalizeCoordinate(node.x, DEFAULT_CANVAS_WIDTH / 2),
        y: normalizeCoordinate(node.y, DEFAULT_CANVAS_MARGIN),
      })),
    };
  }

  return hasSections ? reflowSectionRoadmap(roadmap) : reflowFlatRoadmap(roadmap);
}

export function filterInvalidConnections(roadmap: VisualRoadmap): VisualRoadmap {
  const nodeIds = new Set(roadmap.nodes.map((node) => node.id));
  const seen = new Set<string>();

  const connections = roadmap.connections.filter((connection) => {
    if (!nodeIds.has(connection.from) || !nodeIds.has(connection.to)) {
      return false;
    }

    const key = `${connection.from}:${connection.to}:${connection.type}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return {
    ...roadmap,
    connections,
  };
}

export function sanitizeVisualRoadmap(roadmap: unknown): VisualRoadmap {
  const record = asRecord(roadmap);
  const role = asTrimmedString(record.role) || "Roadmap";
  const title = asTrimmedString(record.title) || `${role} roadmap`;
  const source = asTrimmedString(record.source).toLowerCase() === "ai" ? "ai" : "mock";
  const normalizedNodes = normalizeNodes(record.nodes);
  const normalizedConnections = normalizeConnections(record.connections);
  const id =
    slugify(asTrimmedString(record.id)) ||
    slugify(role) ||
    slugify(title) ||
    "roadmap";

  const sanitized = {
    id,
    title,
    role,
    summary:
      asTrimmedString(record.summary) ||
      `Structured ${source} roadmap for ${role}.`,
    source,
    relatedRoadmaps: normalizeRelatedRoadmaps(record.relatedRoadmaps),
    nodes: normalizedNodes,
    connections: normalizedConnections,
  } satisfies VisualRoadmap;

  return filterInvalidConnections(normalizeRoadmapLayout(sanitized));
}

export function validateVisualRoadmapShape(roadmap: unknown): roadmap is VisualRoadmap {
  const record = asRecord(roadmap);

  if (!Array.isArray(record.nodes) || !Array.isArray(record.connections)) {
    return false;
  }

  const nodes = record.nodes;
  const nodeIds = new Set<string>();

  for (const item of nodes) {
    const node = asRecord(item);
    const id = asTrimmedString(node.id);
    const title = asTrimmedString(node.title);
    const type = asTrimmedString(node.type).toLowerCase();
    const x = Number(node.x);
    const y = Number(node.y);

    if (!id || !title || !Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }

    if (type !== "section" && type !== "skill") {
      return false;
    }

    nodeIds.add(slugify(id));
  }

  for (const item of record.connections) {
    const connection = asRecord(item);
    const from = slugify(asTrimmedString(connection.from));
    const to = slugify(asTrimmedString(connection.to));
    const type = asTrimmedString(connection.type).toLowerCase();

    if (!from || !to || !nodeIds.has(from) || !nodeIds.has(to)) {
      return false;
    }

    if (type !== "solid" && type !== "dotted") {
      return false;
    }
  }

  return true;
}

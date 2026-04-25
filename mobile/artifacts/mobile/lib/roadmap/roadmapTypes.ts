export type VisualRoadmapNode = {
  id: string;
  title: string;
  type: "section" | "skill";
  x: number;
  y: number;
  description?: string;
  parent?: string | null;
  explanation?: string;
  whyItMatters?: string;
  projectIdea?: string;
  estimatedTime?: string;
};

export type VisualRoadmapConnection = {
  from: string;
  to: string;
  type: "solid" | "dotted";
};

export type VisualRoadmap = {
  id: string;
  title: string;
  role: string;
  summary: string;
  source: "mock" | "ai";
  relatedRoadmaps: string[];
  nodes: VisualRoadmapNode[];
  connections: VisualRoadmapConnection[];
};

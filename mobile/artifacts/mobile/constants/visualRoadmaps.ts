import {
  ROLE_ROADMAP_INDEX,
  getRoleRoadmapById,
  getRoleRoadmapByTitle,
} from "@/constants/roleRoadmaps";
import { roleRoadmapToVisualRoadmap } from "@/lib/roadmap/roadmapAdapters";
import type { VisualRoadmap } from "@/lib/roadmap/roadmapTypes";
import { sanitizeVisualRoadmap } from "@/lib/roadmap/roadmapValidation";

function enrichRelatedRoadmaps(roadmaps: VisualRoadmap[]): VisualRoadmap[] {
  return roadmaps.map((roadmap) => {
    const relatedRoadmaps = roadmaps
      .filter((candidate) => candidate.id !== roadmap.id)
      .slice(0, 3)
      .map((candidate) => candidate.id);

    return sanitizeVisualRoadmap({
      ...roadmap,
      relatedRoadmaps,
    });
  });
}

export const VISUAL_ROADMAP_INDEX: VisualRoadmap[] = enrichRelatedRoadmaps(
  ROLE_ROADMAP_INDEX.map(roleRoadmapToVisualRoadmap)
);

export function getVisualRoadmapById(id: string | null | undefined): VisualRoadmap | null {
  const roleRoadmap = getRoleRoadmapById(id);
  if (!roleRoadmap) return null;

  return VISUAL_ROADMAP_INDEX.find((item) => item.id === roleRoadmap.id) || null;
}

export function getVisualRoadmapByRole(role: string | null | undefined): VisualRoadmap | null {
  const roleRoadmap = getRoleRoadmapByTitle(role);
  if (!roleRoadmap) return null;

  return VISUAL_ROADMAP_INDEX.find((item) => item.id === roleRoadmap.id) || null;
}

export function getExampleVisualRoadmap(roleIdOrRole: string | null | undefined): VisualRoadmap {
  return (
    getVisualRoadmapById(roleIdOrRole) ||
    getVisualRoadmapByRole(roleIdOrRole) ||
    VISUAL_ROADMAP_INDEX[0]
  );
}

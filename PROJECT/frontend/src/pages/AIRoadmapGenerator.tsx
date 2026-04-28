import { useState } from "react";
import { Loader2, Map, ChevronRight, Wrench, FolderOpen, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/component/ui/select";
import { useToast } from "@/hooks/use-toast";
import { aiRoadmapService, roadmapService, type AIRoadmapResponse } from "@/lib/api";

// All roles supported by the AI service
const ROLES = [
  { value: "frontend_engineer",          label: "Frontend Engineer" },
  { value: "backend_engineer",           label: "Backend Engineer" },
  { value: "full_stack_engineer",        label: "Full Stack Engineer" },
  { value: "mobile_engineer",            label: "Mobile Engineer" },
  { value: "devops_engineer",            label: "DevOps Engineer" },
  { value: "cloud_engineer",             label: "Cloud Engineer" },
  { value: "platform_engineer",          label: "Platform Engineer" },
  { value: "data_analyst",              label: "Data Analyst" },
  { value: "data_engineer",             label: "Data Engineer" },
  { value: "data_scientist",            label: "Data Scientist" },
  { value: "machine_learning_engineer", label: "Machine Learning Engineer" },
  { value: "ai_engineer",               label: "AI Engineer" },
  { value: "mlops_engineer",            label: "MLOps Engineer" },
  { value: "cybersecurity_analyst",     label: "Cybersecurity Analyst" },
  { value: "qa_automation_engineer",    label: "QA Automation Engineer" },
  { value: "product_manager",           label: "Product Manager" },
  { value: "technical_project_manager", label: "Technical Project Manager" },
];

const STAGE_COLORS: Record<string, string> = {
  "Foundations":          "border-cyan-500/40 bg-cyan-500/5",
  "Build & Ship":         "border-blue-500/40 bg-blue-500/5",
  "Advanced & Production":"border-violet-500/40 bg-violet-500/5",
};
const STAGE_BADGE_COLORS: Record<string, string> = {
  "Foundations":          "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Build & Ship":         "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "Advanced & Production":"bg-violet-500/15 text-violet-400 border-violet-500/25",
};

export default function AIRoadmapGenerator() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<AIRoadmapResponse | null>(null);

  async function handleGenerate() {
    if (!selectedRole) return;
    setLoading(true);
    setRoadmap(null);
    try {
      const result = await aiRoadmapService.generate(selectedRole);
      setRoadmap(result);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message || "Could not reach the AI service. Is Ollama running on port 8000?",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToDB() {
    if (!roadmap) return;
    setSaving(true);
    try {
      // Build a flat list of steps from all stages
      const steps = roadmap.stages.flatMap((stage, stageIdx) =>
        stage.items.map((item, itemIdx) => ({
          title: item,
          stage: stage.title,
          order_index: stageIdx * 100 + itemIdx,
          status: "pending",
        }))
      );

      await roadmapService.create({
        title: `${roadmap.role} Roadmap`,
        summary: `AI-generated learning path for ${roadmap.role}. ${roadmap.stages.length} stages covering ${roadmap.tools.slice(0, 4).join(", ")} and more.`,
        status: "active",
        estimated_weeks: steps.length * 2, // rough estimate
        stages: roadmap.stages.map((s) => s.title),
        tools: roadmap.tools,
        final_projects: roadmap.final_projects,
        steps,
      });

      toast({ title: "Roadmap saved", description: `"${roadmap.role} Roadmap" added to the database.` });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save to the backend.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          AI Roadmap Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate a structured learning roadmap for any engineering role
        </p>
      </div>

      {/* ── Generator card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a target role…" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleGenerate}
              disabled={!selectedRole || loading}
              className="gap-2 sm:w-auto"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Roadmap</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/30 border border-border/30" />
          ))}
        </div>
      )}

      {/* ── Roadmap result ── */}
      {roadmap && !loading && (
        <div className="space-y-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">{roadmap.role} Roadmap</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {roadmap.stages.length} stages · {roadmap.tools.length} key tools
              </p>
            </div>
            <Button onClick={handleSaveToDB} disabled={saving} variant="outline" className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {saving ? "Saving…" : "Save to Database"}
            </Button>
          </div>

          {/* Stages */}
          {roadmap.stages.map((stage) => (
            <Card key={stage.title} className={`border ${STAGE_COLORS[stage.title] ?? "border-border/40"}`}>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_BADGE_COLORS[stage.title] ?? ""}`}
                  >
                    {stage.title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Learning items */}
                <div className="space-y-2">
                  {stage.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/60" />
                      <span className="text-foreground/85">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Projects */}
                {stage.projects.length > 0 && (
                  <div className="border-t border-border/30 pt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" /> Projects
                    </p>
                    {stage.projects.map((p, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground pl-5">
                        {idx + 1}. {p}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Tools */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" /> Key Tools & Technologies
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex flex-wrap gap-2">
                {roadmap.tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Final projects */}
          {roadmap.final_projects.length > 0 && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" /> Capstone Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {roadmap.final_projects.map((p, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/85">{p}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

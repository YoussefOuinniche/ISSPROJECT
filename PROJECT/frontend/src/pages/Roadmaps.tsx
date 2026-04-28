import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Badge } from "@/component/ui/badge";
import { Progress } from "@/component/ui/progress";
import { roadmapService } from "@/lib/api";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  completed: "default",
  active:    "secondary",
  generating:"outline",
  inactive:  "outline",
};

export default function Roadmaps() {
  const navigate = useNavigate();

  const { data: roadmapsData = [], isLoading, error } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  if (isLoading) return <div className="p-4">Loading roadmaps...</div>;
  if (error)     return <div className="p-4 text-destructive">Error loading roadmaps</div>;

  const roadmaps = roadmapsData as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning Roadmaps</h1>
        <p className="text-sm text-muted-foreground">{roadmaps.length} guided learning paths</p>
      </div>

      {roadmaps.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No roadmaps found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roadmaps.map((roadmap) => {
            const total     = roadmap.total_steps     ?? 0;
            const completed = roadmap.completed_steps ?? 0;
            const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <button
                key={roadmap.id}
                onClick={() => navigate(`/roadmaps/${roadmap.id}`)}
                className="text-left group"
              >
                <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 group-hover:translate-y-[-2px]">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                          {roadmap.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {roadmap.estimated_weeks ? `${roadmap.estimated_weeks} weeks` : "Self-paced"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={statusVariant[roadmap.status] ?? "outline"} className="capitalize">
                          {roadmap.status || "pending"}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                    </div>

                    <Progress value={pct} className="h-1.5" />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        {completed}/{total} steps complete
                      </span>
                      <span className="text-xs font-medium">{pct}%</span>
                    </div>

                    {roadmap.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{roadmap.summary}</p>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, Clock, Star, Globe, Tag,
  Zap, BarChart2, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { courseService } from "@/lib/api";

const difficultyColor: Record<string, string> = {
  beginner:     "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  intermediate: "bg-amber-500/10   text-amber-500   border-amber-500/20",
  advanced:     "bg-red-500/10     text-red-500     border-red-500/20",
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ["course", id],
    queryFn: () => courseService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-40 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
          </div>
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <XCircle className="h-12 w-12 text-destructive/60" />
        <p className="text-muted-foreground">Course not found</p>
        <Button variant="outline" onClick={() => navigate("/courses")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Button>
      </div>
    );
  }

  const diff = (course.difficulty_level ?? course.difficulty ?? "").toLowerCase();
  const diffClass = difficultyColor[diff] ?? "bg-secondary text-secondary-foreground";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back + title row */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 flex-shrink-0"
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{course.title}</h1>
          {course.provider && (
            <p className="text-sm text-muted-foreground mt-0.5">by {course.provider}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: description + skills ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description card */}
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                About This Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              {course.description ? (
                <p className="text-sm leading-relaxed text-foreground/80">{course.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}
            </CardContent>
          </Card>

          {/* Skills covered */}
          {course.skills && (
            <Card className="overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Skills Covered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(course.skills) ? course.skills : [course.skills]).map(
                    (skill: any, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                        style={{ borderColor: "hsl(var(--primary)/0.3)", color: "hsl(var(--primary))", background: "hsl(var(--primary)/0.07)" }}
                      >
                        <Zap className="h-3 w-3" />
                        {skill?.name ?? skill}
                      </span>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion stats (if returned by backend) */}
          {(course.total_enrollments ?? course.completion_count) != null && (
            <Card className="overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {course.total_enrollments != null && (
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{course.total_enrollments}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Enrollments</p>
                    </div>
                  )}
                  {course.completion_count != null && (
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{course.completion_count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Completions</p>
                    </div>
                  )}
                  {course.avg_completion_pct != null && (
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{Math.round(course.avg_completion_pct)}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Avg Progress</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: meta sidebar ── */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardContent className="p-5 space-y-4">

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                <Badge variant={course.is_active ? "default" : "secondary"} className="text-xs">
                  {course.is_active ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" />Inactive</>
                  )}
                </Badge>
              </div>

              <div className="h-px bg-border/50" />

              {/* Difficulty */}
              {diff && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5" /> Difficulty
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${diffClass}`}>
                    {diff}
                  </span>
                </div>
              )}

              {/* Duration */}
              {course.duration_hours != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </span>
                  <span className="text-sm font-semibold">{course.duration_hours}h</span>
                </div>
              )}

              {/* Rating */}
              {course.rating != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" /> Rating
                  </span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {Number(course.rating).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Category */}
              {course.categories?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Category
                  </span>
                  <span className="text-sm font-medium">{course.categories.name}</span>
                </div>
              )}

              {/* Free / Paid */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Access
                </span>
                <Badge variant={course.is_free ? "secondary" : "outline"} className="text-xs">
                  {course.is_free ? "Free" : "Paid"}
                </Badge>
              </div>

              {/* URL */}
              {course.url && (
                <>
                  <div className="h-px bg-border/50" />
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium transition-colors"
                    style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.25)" }}
                  >
                    <Globe className="h-4 w-4" />
                    Open Course
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

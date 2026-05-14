import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Share2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { communityService, type CommunityShare } from "@/lib/api";

function displayName(share: CommunityShare) {
  return share.profiles?.full_name?.trim() || "NexaPath learner";
}

function roleName(share: CommunityShare) {
  return (
    share.ai_roadmaps?.job_roles?.title?.trim() ||
    share.ai_roadmaps?.title?.trim() ||
    "Completed roadmap"
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Community() {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await communityService.getShares();
      setShares(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="text-sm text-muted-foreground">
          Completed roadmaps shared by NexaPath learners.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Shared roadmaps
            {!loading && !error ? (
              <span className="text-xs font-normal text-muted-foreground">
                · {shares.length} {shares.length === 1 ? "share" : "shares"}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading shared roadmaps…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-medium">Community feed unavailable</p>
              <p className="text-xs text-muted-foreground max-w-md">{error}</p>
              <button
                type="button"
                className="mt-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                onClick={load}
              >
                Try again
              </button>
            </div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No shared roadmaps yet</p>
              <p className="text-xs text-muted-foreground max-w-md">
                When learners finish a roadmap and tap{" "}
                <span className="font-medium text-foreground">Share to Community</span> on the
                mobile Roadmap tab, it shows up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {shares.map((share) => {
                const pct = share.total_steps
                  ? Math.round((share.completed_steps / share.total_steps) * 100)
                  : 0;
                return (
                  <li key={share.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{share.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {displayName(share)} · {roleName(share)}
                      </p>
                      {share.summary ? (
                        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                          {share.summary}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="rounded-full border bg-primary/5 px-2 py-0.5 text-primary">
                          {share.completed_steps}/{share.total_steps} steps · {pct}%
                        </span>
                        <span>{formatDate(share.shared_at)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

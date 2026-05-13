import { Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";

export default function Community() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="text-sm text-muted-foreground">Completed roadmaps shared by NexaPath learners.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Shared roadmaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Learners can share finished roadmaps from the mobile Roadmap tab. Apply
            `migration_add_community_roadmap_shares.sql` to enable the feed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Badge } from "@/component/ui/badge";
import { skillService } from "@/lib/api";

export default function Skills() {
  const { data: skillsData = [], isLoading, error } = useQuery({
    queryKey: ["skills"],
    queryFn: () => skillService.getAll(),
  });

  if (isLoading) return <div className="p-4">Loading skills...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading skills</div>;

  const skills = skillsData as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-muted-foreground">{skills.length} skills tracked</p>
      </div>

      {skills.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No skills found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skills.map((skill) => (
            <Card
              key={skill.id}
              className="transition-all duration-200 ease-in-out hover:shadow-md cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium leading-tight">{skill.name}</h3>
                  <Zap className="w-4 h-4 text-yellow-500 shrink-0 ml-2" />
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {skill.skill_type && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {skill.skill_type}
                    </Badge>
                  )}
                  {skill.category_id && (
                    <Badge variant="outline" className="text-xs font-mono max-w-[100px] truncate">
                      {skill.category_id}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {skill.description || "No description available"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

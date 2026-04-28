import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/component/ui/card";
import { Badge } from "@/component/ui/badge";
import { jobRoleService } from "@/lib/api";

function formatDZD(amount: number) {
  return new Intl.NumberFormat("fr-DZ").format(amount) + " DA";
}

export default function JobRoles() {
  const { data: jobRolesData = [], isLoading, error } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => jobRoleService.getAll(),
  });

  if (isLoading) return <div className="p-4">Loading job roles...</div>;
  if (error)     return <div className="p-4 text-destructive">Error loading job roles</div>;

  const roles = jobRolesData as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Job Roles</h1>
        <p className="text-sm text-muted-foreground">{roles.length} career paths</p>
      </div>

      {roles.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No job roles found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="card-3d transition-all duration-200 hover:shadow-md overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-semibold">{role.title}</h3>
                  {role.avg_salary_usd != null && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {formatDZD(role.avg_salary_usd)} avg. salary
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {role.seniority_level && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {role.seniority_level}
                    </Badge>
                  )}
                  {role.is_active !== undefined && (
                    <Badge variant={role.is_active ? "default" : "outline"} className="text-xs">
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>

                {role.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Users, BookOpen, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { StatsCard } from "@/component/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { Badge } from "@/component/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { userService, courseService, skillService, progressService } from "@/lib/api";
import { groupByMonth, initials } from "@/utils/formatters";
import { ROUTES } from "@/constants";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: () => courseService.getAll(),
  });

  const { data: skills = [] } = useQuery<any[]>({
    queryKey: ["skills"],
    queryFn: () => skillService.getAll(),
  });

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: ["progress"],
    queryFn: () => progressService.getAll(),
  });

  const totalUsers    = users.length;
  const activeCourses = courses.filter((c) => c.is_active).length;
  const trackedSkills = skills.length;
  const totalProgress = progress.length;

  const usersByMonth       = groupByMonth(users,    "created_at").map((d) => ({ month: d.month, users: d.count }));
  const enrollmentsByMonth = groupByMonth(progress, "created_at").map((d) => ({ month: d.month, enrollments: d.count }));

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome back, Admin</p>
      </div>

      {/* ── Stats (clickable) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <button className="text-left" onClick={() => navigate(ROUTES.USERS)}>
          <StatsCard
            title="Total Users"
            value={totalUsers.toLocaleString()}
            change={totalUsers > 0 ? `${totalUsers} registered` : "No users yet"}
            changeType="positive"
            icon={Users}
          />
        </button>
        <button className="text-left" onClick={() => navigate(ROUTES.COURSES)}>
          <StatsCard
            title="Active Courses"
            value={activeCourses.toLocaleString()}
            change={`${courses.length} total courses`}
            changeType="positive"
            icon={BookOpen}
          />
        </button>
        <button className="text-left" onClick={() => navigate(ROUTES.SKILLS)}>
          <StatsCard
            title="Skills Tracked"
            value={trackedSkills.toLocaleString()}
            change={trackedSkills > 0 ? `${trackedSkills} available` : "None yet"}
            changeType="neutral"
            icon={Zap}
          />
        </button>
        <button className="text-left" onClick={() => navigate(ROUTES.ROADMAPS)}>
          <StatsCard
            title="Learning Progress"
            value={totalProgress.toLocaleString()}
            change={totalProgress > 0 ? `${totalProgress} records` : "No progress yet"}
            changeType="positive"
            icon={TrendingUp}
          />
        </button>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-3d overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              New Users · last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={usersByMonth} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "hsl(var(--primary) / 0.06)" }} />
                <Bar dataKey="users" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-3d overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Course Enrollments · last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={enrollmentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Line type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Users ── */}
      <Card className="card-3d overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Users
            </CardTitle>
            <Link
              to={ROUTES.USERS}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground"
              style={{ color: "hsl(var(--primary))" }}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                  <div className="skeleton h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No users yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {users.slice(0, 5).map((user, i) => (
                <button
                  key={user.id ?? i}
                  onClick={() => navigate(ROUTES.USERS)}
                  className="w-full flex items-center justify-between py-3 first:pt-0 last:pb-0 group text-left hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center text-xs font-semibold text-primary transition-all group-hover:ring-primary/40">
                      {initials(user.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{user.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{user.role || "user"}</p>
                    </div>
                  </div>
                  <Badge
                    variant={user.subscription_status === "active" ? "default" : "outline"}
                    className="text-xs font-normal"
                  >
                    {user.subscription_status ?? "Free"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

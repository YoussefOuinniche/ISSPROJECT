import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Pencil, Trash2, Users, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/component/ui/dialog";
import { Input } from "@/component/ui/input";
import { Label } from "@/component/ui/label";
import { planService, subscriptionService } from "@/lib/api";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  slug?: string;
  price_usd: number;
  billing_period: string;
  max_roadmaps?: number;
  features?: Record<string, unknown>;
  is_active?: boolean;
  description?: string;
}

const emptyForm = {
  name: "", price_usd: "", billing_period: "monthly",
  description: "", max_roadmaps: "",
};

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm]               = useState(emptyForm);

  const { data: plans = [], isLoading, error } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => planService.getAll() as unknown as Promise<Plan[]>,
  });

  // Fetch all subscriptions to count per plan
  const { data: subscriptions = [] } = useQuery<any[]>({
    queryKey: ["subscriptions"],
    queryFn: () => subscriptionService.getAll(),
  });

  // Count active subscribers per plan
  const subCountByPlan = (subscriptions as any[]).reduce<Record<string, number>>((acc, sub) => {
    if (sub.status === "active" && sub.plan_id) {
      acc[sub.plan_id] = (acc[sub.plan_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  // Find most popular plan id
  const bestPlanId = plans.reduce<{ id: string; count: number } | null>((best, plan) => {
    const count = subCountByPlan[plan.id] ?? 0;
    if (!best || count > best.count) return { id: plan.id, count };
    return best;
  }, null)?.id;

  const createMutation = useMutation({
    mutationFn: (data: unknown) => planService.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan created"); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => planService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan updated"); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => planService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setEditingPlan(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({ name: plan.name, price_usd: String(plan.price_usd), billing_period: plan.billing_period || "monthly", description: (plan.description as string) || "", max_roadmaps: plan.max_roadmaps ? String(plan.max_roadmaps) : "" });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingPlan(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, price_usd: parseFloat(form.price_usd) || 0, billing_period: form.billing_period, description: form.description, max_roadmaps: form.max_roadmaps ? parseInt(form.max_roadmaps) : null, slug: form.name.toLowerCase().replace(/\s+/g, "-") };
    editingPlan ? updateMutation.mutate({ id: editingPlan.id, data: payload }) : createMutation.mutate(payload);
  };

  if (isLoading) return <div className="p-4">Loading plans...</div>;
  if (error)     return <div className="p-4 text-destructive">Error loading plans</div>;

  const isPending = createMutation.isPending || updateMutation.isPending;
  const totalActive = Object.values(subCountByPlan).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            {plans.length} plans · {totalActive} active subscribers
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No plans yet. Create your first plan.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans
            .slice()
            .sort((a, b) => (subCountByPlan[b.id] ?? 0) - (subCountByPlan[a.id] ?? 0))
            .map((plan) => {
              const subCount  = subCountByPlan[plan.id] ?? 0;
              const isBest    = plan.id === bestPlanId && subCount > 0;
              const pct       = totalActive > 0 ? Math.round((subCount / totalActive) * 100) : 0;

              return (
                <Card
                  key={plan.id}
                  className="relative overflow-hidden transition-all duration-200"
                  style={isBest ? { borderColor: "hsl(var(--primary)/0.5)", boxShadow: "0 0 20px hsl(var(--primary)/0.10)" } : undefined}
                >
                  {/* Top accent line */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(var(--primary)/${isBest ? "0.8" : "0.3"}), transparent)` }}
                  />

                  <CardHeader className="pb-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isBest && (
                          <Badge className="gap-1 text-xs" style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.3)" }}>
                            <Crown className="h-3 w-3" /> Best
                          </Badge>
                        )}
                        {plan.is_active && <Badge variant="secondary" className="text-xs">Active</Badge>}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <span className="text-3xl font-bold">${plan.price_usd}</span>
                      <span className="text-sm text-muted-foreground">/{plan.billing_period || "month"}</span>
                    </div>

                    {/* Subscriber count */}
                    <div
                      className="flex items-center justify-between rounded-lg px-3 py-2 mt-1"
                      style={{ background: "hsl(var(--muted)/0.5)" }}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Active subscribers
                      </div>
                      <span className="text-sm font-bold tabular-nums">{subCount}</span>
                    </div>

                    {/* Share bar */}
                    {totalActive > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: "hsl(var(--primary))" }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">{pct}% of subscribers</p>
                      </div>
                    )}

                    {plan.max_roadmaps && (
                      <p className="text-xs text-muted-foreground">Up to {plan.max_roadmaps} roadmaps</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {plan.description && (
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    )}
                    {plan.features && Object.keys(plan.features).length > 0 && (
                      <ul className="space-y-1">
                        {Object.entries(plan.features).map(([key, val]) => (
                          <li key={key} className="flex items-center gap-2 text-xs">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{String(val)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" size="sm" onClick={() => openEdit(plan)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm(`Delete plan "${plan.name}"?`)) deleteMutation.mutate(plan.id); }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pro" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD) *</Label>
                <Input id="price" type="number" min="0" step="0.01" value={form.price_usd} onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))} placeholder="29.99" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing">Billing Period</Label>
                <Input id="billing" value={form.billing_period} onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))} placeholder="monthly" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_roadmaps">Max Roadmaps</Label>
              <Input id="max_roadmaps" type="number" min="1" value={form.max_roadmaps} onChange={(e) => setForm((f) => ({ ...f, max_roadmaps: e.target.value }))} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Plan description..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

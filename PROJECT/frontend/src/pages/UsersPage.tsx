import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, UserCircle2 } from "lucide-react";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import { Label } from "@/component/ui/label";
import { Card, CardContent, CardHeader } from "@/component/ui/card";
import { Avatar, AvatarFallback } from "@/component/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/component/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/component/ui/dialog";
import { ConfirmDialog } from "@/component/ConfirmDialog";
import { toast } from "sonner";
import { userService } from "@/lib/api";
import { initials } from "@/utils/formatters";

const EMPTY_FORM = { full_name: "", bio: "", avatar_url: "" };

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // ── dialogs state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── queries ────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
  });

  const filtered = (users as any[]).filter((u) =>
    `${u.full_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // ── mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => userService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success("User created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) =>
      userService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditUser(null);
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteUser(null);
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function openEdit(user: any) {
    setForm({ full_name: user.full_name ?? "", bio: user.bio ?? "", avatar_url: user.avatar_url ?? "" });
    setEditUser(user);
  }

  function handleFormChange(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading users…</div>;
  if (error) return <div className="p-4 text-destructive">Error loading users</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{(users as any[]).length} registered users</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary border-0"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {search ? "No users match your search" : "No users yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id} className="transition-all hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials(user.full_name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.full_name || "—"}</p>
                          {user.bio && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.bio}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {user.role || "user"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.plan_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.subscription_status === "active" ? "default" : "outline"}
                        className="capitalize text-xs"
                      >
                        {user.subscription_status || "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" /> New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => handleFormChange("full_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Input
                placeholder="Short description…"
                value={form.bio}
                onChange={(e) => handleFormChange("bio", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Avatar URL</Label>
              <Input
                placeholder="https://…"
                value={form.avatar_url}
                onChange={(e) => handleFormChange("avatar_url", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.full_name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => handleFormChange("full_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Input
                placeholder="Short description…"
                value={form.bio}
                onChange={(e) => handleFormChange("bio", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Avatar URL</Label>
              <Input
                placeholder="https://…"
                value={form.avatar_url}
                onChange={(e) => handleFormChange("avatar_url", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => updateMutation.mutate({ id: editUser.id, data: form })}
              disabled={!form.full_name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(o) => { if (!o) setDeleteUser(null); }}
        title="Delete user?"
        description={
          <>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {deleteUser?.full_name || "this user"}
            </span>. This action cannot be undone.
          </>
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteUser.id)}
      />
    </div>
  );
}

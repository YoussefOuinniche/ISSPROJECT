import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Trash2, Edit, Eye } from "lucide-react";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import { Badge } from "@/component/ui/badge";
import { Card, CardContent, CardHeader } from "@/component/ui/card";
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
} from "@/component/ui/dialog";
import { Label } from "@/component/ui/label";
import { courseService } from "@/lib/api";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  provider?: string;
  url?: string;
  duration_hours?: number;
  difficulty?: string;
  category_id?: string;
  is_active?: boolean;
}

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  provider: "",
  url: "",
  duration_hours: "",
  difficulty: "beginner",
  category_id: "",
};

export default function Courses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  // Fetch courses
  const {
    data: coursesData = [],
    isLoading,
    error,
  } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: () => courseService.getAll() as unknown as Promise<Course[]>,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: unknown) => courseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course created successfully");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create course"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      courseService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course updated successfully");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update course"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete course"),
  });

  const filteredCourses = coursesData.filter((course) =>
    course.title?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      slug: course.slug || "",
      description: course.description || "",
      provider: course.provider || "",
      url: course.url || "",
      duration_hours: course.duration_hours ? String(course.duration_hours) : "",
      difficulty: course.difficulty || "beginner",
      category_id: course.category_id || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      description: form.description || undefined,
      provider: form.provider || undefined,
      url: form.url || undefined,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
      difficulty: form.difficulty || undefined,
      category_id: form.category_id || undefined,
    };

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  };

  const field = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (isLoading) return <div className="p-4">Loading courses...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading courses</div>;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {coursesData.length} total courses
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add Course
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-secondary border-0"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredCourses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No courses match your search" : "No courses yet. Add your first course."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {course.provider || "—"}
                    </TableCell>
                    <TableCell>{course.duration_hours ? `${course.duration_hours}h` : "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={course.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {course.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {course.difficulty || "—"}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/courses/${course.id}`)}
                        aria-label={`View ${course.title}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(course)}
                        aria-label={`Edit ${course.title}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(course.id, course.title)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${course.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course" : "Add Course"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="Introduction to TypeScript"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => field("slug", e.target.value)}
                placeholder="intro-to-typescript (auto-generated if empty)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={form.provider}
                  onChange={(e) => field("provider", e.target.value)}
                  placeholder="Udemy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.duration_hours}
                  onChange={(e) => field("duration_hours", e.target.value)}
                  placeholder="8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={form.difficulty}
                  onChange={(e) => field("difficulty", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category ID</Label>
                <Input
                  id="category"
                  value={form.category_id}
                  onChange={(e) => field("category_id", e.target.value)}
                  placeholder="UUID (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Course URL</Label>
              <Input
                id="url"
                type="url"
                value={form.url}
                onChange={(e) => field("url", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="Brief course description..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : editingCourse
                  ? "Save Changes"
                  : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

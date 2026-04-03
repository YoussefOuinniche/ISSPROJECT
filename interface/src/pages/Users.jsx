import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BrainCircuit,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { getAdminUserDetail, recomputeAdminUserAnalysis } from '../api/admin';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useUserActions, useUsers } from '../hooks/useUsers';

const roleTone = {
  admin: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
  user: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100',
};

export default function Users() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const usersQuery = useUsers({ query: searchQuery, role: 'all', page: 1, pageSize: 250 });
  const users = usersQuery.data?.items || [];

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
      return;
    }

    if (selectedUserId && users.every((user) => user.id !== selectedUserId)) {
      setSelectedUserId(users[0]?.id || '');
    }
  }, [selectedUserId, users]);

  const detailQuery = useQuery({
    queryKey: ['admin-user-detail', selectedUserId],
    queryFn: () => getAdminUserDetail(selectedUserId),
    enabled: Boolean(selectedUserId),
    staleTime: 1000 * 20,
  });

  const { update, remove } = useUserActions();
  const recompute = useMutation({
    mutationFn: (id) => recomputeAdminUserAnalysis({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast.success('User AI analysis recomputed');
    },
    onError: (error) => toast.error(error?.message || 'Unable to recompute analysis'),
  });

  const totals = useMemo(() => {
    const admins = users.filter((user) => user.role === 'admin').length;
    return {
      total: usersQuery.data?.total ?? users.length,
      admins,
      users: Math.max(0, (usersQuery.data?.total ?? users.length) - admins),
    };
  }, [users, usersQuery.data?.total]);

  const detail = detailQuery.data;

  const handleRoleToggle = async () => {
    if (!detail?.user?.id) return;
    const nextRole = detail.user.role === 'admin' ? 'user' : 'admin';
    try {
      await update.mutateAsync({ id: detail.user.id, patch: { role: nextRole } });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', detail.user.id] });
      toast.success(`Role updated to ${nextRole}`);
    } catch (error) {
      toast.error(error?.message || 'Unable to update user role');
    }
  };

  const handleDelete = async () => {
    if (!detail?.user?.id) return;
    const confirmed = window.confirm(`Delete ${detail.user.full_name || detail.user.email}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await remove.mutateAsync(detail.user.id);
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedUserId('');
    } catch (error) {
      toast.error(error?.message || 'Unable to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-app px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="card-premium p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Talent Pool Control
              </div>
              <h1 className="text-3xl font-semibold text-white lg:text-4xl">Inspect users, skills, target roles, and AI guidance</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-300">
                This screen stays connected to the real SkillPulse user directory and exposes direct admin actions for role changes, deletion, and AI recomputation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => usersQuery.refetch()} variant="secondary" icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}>
                Refresh users
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryTile label="Registered users" value={totals.total} helper="Admin web directory" />
          <SummaryTile label="Administrators" value={totals.admins} helper="Elevated control access" />
          <SummaryTile label="Regular users" value={totals.users} helper="Talent pool members" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
          <section className="card-premium p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">User directory</h2>
                <p className="text-sm text-text-muted">{usersQuery.isLoading ? 'Loading users...' : `${users.length} records loaded`}</p>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, email, or role"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand/45 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              {users.map((user) => {
                const selected = selectedUserId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-4 text-left transition-all ${
                      selected
                        ? 'card-premium-soft border-brand/30 shadow-[0_12px_30px_rgba(34,211,238,0.08)]'
                        : 'card-premium-soft hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{user.full_name || user.email}</p>
                        <p className="mt-1 text-xs text-text-muted">{user.email}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleTone[user.role] || roleTone.user}`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </button>
                );
              })}

              {!usersQuery.isLoading && users.length === 0 ? (
                <div className="card-premium-soft border-dashed px-5 py-12 text-center text-sm text-text-muted">
                  No users match the current search.
                </div>
              ) : null}
            </div>
          </section>

          <section className="card-premium p-5">
            {detailQuery.isLoading ? (
              <div className="flex min-h-[520px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
                  <p className="text-sm text-text-muted">Loading user intelligence</p>
                </div>
              </div>
            ) : detail ? (
              <div className="space-y-6">
                <div className="card-premium p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleTone[detail.user.role] || roleTone.user}`}>
                          {detail.user.role}
                        </span>
                        {detail.profile?.title ? <Badge>{detail.profile.title}</Badge> : null}
                        {detail.aiProfile?.target_role ? <Badge>{detail.aiProfile.target_role}</Badge> : null}
                      </div>
                      <h2 className="text-2xl font-semibold text-white">{detail.user.full_name || detail.user.email}</h2>
                      <p className="mt-2 text-sm text-slate-300">{detail.user.email}</p>
                      <p className="mt-3 max-w-3xl text-sm text-text-muted">
                        {detail.aiSummary?.next_step || 'This user has not generated a next AI step yet.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => recompute.mutate(detail.user.id)} loading={recompute.isPending} icon={<BrainCircuit className="h-4 w-4" aria-hidden="true" />}>
                        Recompute AI
                      </Button>
                      <Button onClick={handleRoleToggle} variant="secondary" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
                        {detail.user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                      </Button>
                      <Button onClick={handleDelete} variant="danger" icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryTile label="Completion" value={`${detail.completion?.value || 0}%`} helper={detail.completion?.status || 'unknown'} />
                  <SummaryTile label="AI confidence" value={`${Math.round((detail.aiProfile?.confidence || 0) * 100)}%`} helper="Stored AI profile" />
                  <SummaryTile label="Skills" value={detail.skills?.length || 0} helper="Mapped user skills" />
                  <SummaryTile label="Urgent gaps" value={detail.gapStatistics?.high_priority_count || 0} helper="Gap level 4+" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title="Skills">
                    <div className="flex flex-wrap gap-2">
                      {(detail.skills || []).map((skill) => (
                        <span key={`${skill.skill_id}-${skill.skill_name}`} className="rounded-full border border-cyan-500/18 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100">
                          {skill.skill_name}
                          <span className="ml-2 text-text-muted">{skill.proficiency_level}</span>
                        </span>
                      ))}
                      {(detail.skills || []).length === 0 ? <EmptyText>No skills mapped yet.</EmptyText> : null}
                    </div>
                  </Panel>

                  <Panel title="Skill gaps">
                    <div className="space-y-3">
                      {(detail.skillGaps || []).slice(0, 8).map((gap) => (
                        <div key={gap.id || `${gap.skill_name}-${gap.domain}`} className="card-premium-soft p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text-primary">{gap.skill_name}</p>
                              <p className="text-xs text-text-muted">{gap.domain}</p>
                            </div>
                            <span className="text-xs text-text-muted">{gap.gap_level}/5</span>
                          </div>
                          <p className="mt-2 text-sm text-text-secondary">{gap.reason || 'No reason captured yet.'}</p>
                        </div>
                      ))}
                      {(detail.skillGaps || []).length === 0 ? <EmptyText>No skill gaps are currently stored for this user.</EmptyText> : null}
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                  <Panel title="AI summary">
                    <div className="space-y-3 text-sm text-text-secondary">
                      <SummaryRow label="Target role" value={detail.aiSummary?.target_role || detail.profile?.explicit_target_role || 'Unassigned'} />
                      <SummaryRow label="Top skills" value={(detail.aiSummary?.top_skills || []).join(', ') || 'No highlights yet'} />
                      <SummaryRow label="Urgent gaps" value={(detail.aiSummary?.urgent_gaps || []).join(', ') || 'None highlighted'} />
                      <SummaryRow label="Last active" value={detail.activity?.lastActiveAt ? new Date(detail.activity.lastActiveAt).toLocaleString('en-GB') : 'No activity'} />
                    </div>
                  </Panel>

                  <Panel title="Recommendations">
                    <div className="space-y-3">
                      {(detail.recommendations || []).map((item) => (
                        <div key={item.id || item.title} className="card-premium-soft p-3">
                          <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                          <p className="mt-1 text-sm text-text-secondary">{item.content || 'No recommendation detail available.'}</p>
                        </div>
                      ))}
                      {(detail.recommendations || []).length === 0 ? <EmptyText>No recommendations are currently stored for this user.</EmptyText> : null}
                    </div>
                  </Panel>
                </div>

                {detailQuery.isError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      {detailQuery.error?.message || 'Unable to load this user'}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="card-premium-soft flex min-h-[520px] items-center justify-center border-dashed px-6 text-center">
                <div>
                  <p className="text-base font-semibold text-text-primary">Select a user to inspect their SkillPulse profile</p>
                  <p className="mt-2 text-sm text-text-muted">
                    The detail panel shows skills, target role, AI guidance, gap severity, and admin actions.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, helper }) {
  return (
    <div className="card-premium-soft p-4">
      <p className="admin-card-label">{label}</p>
      <p className="admin-card-stat mt-3 text-2xl">{value}</p>
      <p className="admin-card-copy mt-1 text-sm">{helper}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="card-premium-soft p-4">
      <h3 className="admin-card-title mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-text-secondary">{children}</span>;
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="max-w-[60%] text-right text-text-primary">{value}</span>
    </div>
  );
}

function EmptyText({ children }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}

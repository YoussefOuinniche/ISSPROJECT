import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Camera,
  KeyRound,
  Mail,
  Palette,
  Trash,
  RefreshCcw,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  User,
  Users,
  WandSparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useSettings } from '../hooks/useSettings';
import { useUserActions, useUsers } from '../hooks/useUsers';
import Button, { IconButton } from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Dropdown from '../components/ui/Dropdown';
import { Input, SearchInput } from '../components/ui/Input';
import Tooltip from '../components/ui/Tooltip';
import Skeleton from '../components/ui/Skeleton';
import Drawer from '../components/ui/Drawer';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { clearAuthTokens } from '../utils/auth';
import useSessionUser from '../hooks/useSessionUser';

const adminSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'user']),
});

const profileSchema = z.object({
  domain: z.string().min(2, 'Domain is required').max(60, 'Domain is too long'),
  title: z.string().min(2, 'Title is required').max(80, 'Title is too long'),
  experience_level: z.string().min(2, 'Experience level is required').max(40, 'Experience level is too long'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your new password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const statMeta = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, action: { path: '/users' } },
  { key: 'totalAdmins', label: 'Administrators', icon: Shield, action: { path: '/users', query: { role: 'admin' } } },
  { key: 'totalSkills', label: 'Skills Tracked', icon: Sparkles, action: { path: '/content', query: { type: 'Skill' } } },
  { key: 'totalTrends', label: 'Active Trends', icon: Settings2, action: { path: '/analytics', query: { focus: 'trends' } } },
  { key: 'totalSkillGaps', label: 'Skill Gaps', icon: AlertTriangle, action: { path: '/analytics', query: { focus: 'skill-gaps' } } },
];

const roleVariant = (role) => (String(role || '').toLowerCase() === 'admin' ? 'brand' : 'neutral');

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildNavTarget = (path, query) => {
  if (!query) return path;
  const params = new URLSearchParams(query);
  return `${path}?${params.toString()}`;
};

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const { user: sessionUser, setUser: setSessionUser, updateUser: updateSessionUser } = useSessionUser();

  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, action: null, title: '', description: '', target: null });
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const settings = useSettings();
  const users = useUsers({ query: searchQuery, role: roleFilter, page, pageSize: 8 });
  const userActions = useUserActions();

  const settingsData = settings.data || {
    currentUser: null,
    currentProfile: null,
    system: { totalUsers: 0, totalAdmins: 0, totalSkills: 0, totalTrends: 0, totalSkillGaps: 0 },
    recentUsers: [],
  };

  const adminForm = useForm({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'admin',
    },
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      domain: '',
      title: '',
      experience_level: '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const hasUnsavedChanges = isAdminEditing || isProfileEditing;
  const avatarPalette = ['#22d3ee', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#f87171'];

  const displayName = adminForm.watch('full_name') || sessionUser?.fullName || sessionUser?.full_name || settingsData.currentUser?.full_name || 'Admin';
  const avatarUrl = sessionUser?.avatarUrl || sessionUser?.avatar_url || '';
  const avatarColor = sessionUser?.avatarColor || '#22d3ee';
  const initials = displayName
    ? displayName.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  useEffect(() => {
    if (!settingsData.currentUser) return;
    adminForm.reset({
      full_name: settingsData.currentUser.full_name || '',
      email: settingsData.currentUser.email || '',
      role: settingsData.currentUser.role || 'admin',
    });
  }, [settingsData.currentUser, adminForm]);

  useEffect(() => {
    if (!settingsData.currentProfile) return;
    profileForm.reset({
      domain: settingsData.currentProfile.domain || '',
      title: settingsData.currentProfile.title || '',
      experience_level: settingsData.currentProfile.experience_level || '',
    });
  }, [settingsData.currentProfile, profileForm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const onSaveAdmin = adminForm.handleSubmit(async (values) => {
    const previousUser = sessionUser;
    updateSessionUser({
      fullName: values.full_name,
      full_name: values.full_name,
      email: values.email,
      role: values.role,
    });

    try {
      await settings.updateAdmin.mutateAsync(values);
      setIsAdminEditing(false);
      toast.success('Admin account updated');
    } catch (error) {
      if (previousUser) setSessionUser(previousUser);
      toast.error(error?.message || 'Failed to update admin account');
    }
  });

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    try {
      await settings.updateProfile.mutateAsync(values);
      setIsProfileEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update profile');
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await settings.changePassword.mutateAsync(values);
      toast.success('Password changed successfully');
      setIsPasswordOpen(false);
      passwordForm.reset();
    } catch (error) {
      toast.error(error?.message || 'Failed to change password');
    }
  });

  const refreshAll = async () => {
    try {
      await Promise.all([settings.refresh(), users.refetch()]);
      toast.info('Data refreshed');
    } catch {
      toast.error('Refresh failed');
    }
  };

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email || '');
      toast.success('Email copied');
    } catch {
      toast.error('Unable to copy email');
    }
  };

  const openDeleteConfirm = (user) => {
    setConfirmState({
      open: true,
      action: 'delete',
      title: 'Delete user?',
      description: `This action permanently removes ${user.full_name || user.email}.`,
      target: user,
    });
  };

  const openDisableConfirm = (user) => {
    const nextStatus = user.status === 'disabled' ? 'active' : 'disabled';
    setConfirmState({
      open: true,
      action: 'toggle-status',
      title: `${nextStatus === 'disabled' ? 'Disable' : 'Enable'} user?`,
      description: `This will set ${user.full_name || user.email} to ${nextStatus}.`,
      target: user,
    });
  };

  const openLogoutConfirm = () => {
    setConfirmState({
      open: true,
      action: 'logout',
      title: 'Log out now?',
      description: 'This will end your session and return to login.',
      target: null,
    });
  };

  const executeConfirmAction = async () => {
    const { action, target } = confirmState;
    if (!action) return;

    try {
      if (action === 'logout') {
        clearAuthTokens();
        window.location.href = '/login';
        return;
      }

      if (action === 'delete' && target) {
        await userActions.remove.mutateAsync(target.id);
        toast.success('User deleted');
      }

      if (action === 'toggle-status' && target) {
        const patch = { status: target.status === 'disabled' ? 'active' : 'disabled' };
        await userActions.update.mutateAsync({ id: target.id, patch });
        toast.success('User status updated');
      }

      setConfirmState({ open: false, action: null, title: '', description: '', target: null });
      users.refetch();
    } catch (error) {
      toast.error(error?.message || 'Action failed');
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      await userActions.update.mutateAsync({ id: user.id, patch: { role } });
      toast.success('Role updated');
      users.refetch();
    } catch (error) {
      toast.error(error?.message || 'Failed to update role');
    }
  };

  const handleResetPassword = async (user) => {
    try {
      await userActions.update.mutateAsync({ id: user.id, patch: { updated_at: new Date().toISOString() } });
      toast.info(`Password reset link sent to ${user.email}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to reset password');
    }
  };

  const runAnalysisNow = async () => {
    setIsAnalysisRunning(true);
    try {
      await settings.recompute.mutateAsync();
      toast.success('Profile analysis completed');
    } catch (error) {
      toast.error(error?.message || 'Failed to recompute analysis');
    } finally {
      setIsAnalysisRunning(false);
    }
  };

  const stats = useMemo(
    () => statMeta.map((item) => ({ ...item, value: settingsData.system?.[item.key] ?? 0 })),
    [settingsData.system],
  );

  const tableItems = users.data?.items || settingsData.recentUsers || [];
  const totalPages = users.data?.totalPages || 1;

  const onAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    setAvatarUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      updateSessionUser({
        avatarUrl: dataUrl,
        avatar_url: dataUrl,
      });
      toast.success('Profile icon updated');
    } catch {
      toast.error('Unable to process selected image');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const onAvatarRemove = () => {
    updateSessionUser({
      avatarUrl: '',
      avatar_url: '',
    });
    toast.info('Profile icon removed');
  };

  const onAvatarColorChange = (color) => {
    updateSessionUser({ avatarColor: color });
    toast.info('Profile icon color updated');
  };

  const enterAdminEditMode = () => {
    window.requestAnimationFrame(() => {
      setIsAdminEditing(true);
    });
  };

  const enterProfileEditMode = () => {
    window.requestAnimationFrame(() => {
      setIsProfileEditing(true);
    });
  };

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="min-h-screen bg-app px-4 pb-8 pt-6 md:px-6"
    >
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header className="glass-surface sticky top-[72px] z-30 rounded-panel px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-text-primary">Settings</h1>
              <p className="mt-1 text-sm text-text-secondary">Manage account, profile and users with persisted updates.</p>
            </div>
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <SearchInput
                aria-label="Search users"
                placeholder="Search users..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full lg:w-72"
              />
              <Button
                variant="secondary"
                onClick={refreshAll}
                loading={settings.isRefetching || users.isFetching}
                aria-label="Refresh settings and users"
                icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {(settings.isLoading ? statMeta : stats).map((item, index) => {
            const Icon = item.icon;
            const target = buildNavTarget(item.action.path, item.action.query);
            return (
              <Tooltip key={item.key} content={`Open ${item.label}`}>
                <motion.button
                  type="button"
                  onClick={() => navigate(target)}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: reducedMotion ? 0 : index * 0.05 }}
                  className="text-left"
                >
                  <Card className="h-full p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/35 bg-brand/12 text-brand shadow-[0_0_20px_rgba(34,211,238,0.14)]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <Badge variant="neutral">View</Badge>
                    </div>
                    <p className="mt-4 text-meta text-text-muted">{item.label}</p>
                    {settings.isLoading ? (
                      <Skeleton className="mt-2 h-9 w-24" />
                    ) : (
                      <p className="mt-1 text-[1.9rem] font-bold leading-none text-text-primary tabular-nums">{item.value.toLocaleString()}</p>
                    )}
                  </Card>
                </motion.button>
              </Tooltip>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <div className="mb-4 border-b border-border-subtle/15 pb-3">
              <h2 className="text-text-primary">Current Admin Account</h2>
              <p className="text-meta text-text-muted">Update your account details and credentials.</p>
            </div>

            {settings.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <form className="space-y-3" onSubmit={onSaveAdmin}>
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted" htmlFor="admin-name">Name</label>
                  <Input id="admin-name" disabled={!isAdminEditing} {...adminForm.register('full_name')} />
                  {adminForm.formState.errors.full_name ? <p className="mt-1 text-xs text-red-300">{adminForm.formState.errors.full_name.message}</p> : null}
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="text-meta text-text-muted" htmlFor="admin-email">Email</label>
                    <Tooltip content="Copy email">
                      <IconButton ariaLabel="Copy admin email" onClick={() => copyEmail(adminForm.getValues('email'))}>
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <Input id="admin-email" disabled={!isAdminEditing} {...adminForm.register('email')} />
                  {adminForm.formState.errors.email ? <p className="mt-1 text-xs text-red-300">{adminForm.formState.errors.email.message}</p> : null}
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted" htmlFor="admin-role">Role</label>
                  <select
                    id="admin-role"
                    disabled={!isAdminEditing}
                    {...adminForm.register('role')}
                    className="mt-1 h-10 w-full rounded-xl border border-border-subtle/20 bg-app-elevated px-3 text-sm text-text-primary"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted">Profile Icon</label>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div
                      className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-base font-bold text-app ring-2 ring-brand/25"
                      style={!avatarUrl ? { backgroundColor: avatarColor } : undefined}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Admin avatar" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>

                    <label className="inline-flex cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
                      <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle/25 px-3 text-sm text-text-secondary transition-all duration-fast hover:border-brand/40 hover:text-text-primary">
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        {avatarUploading ? 'Uploading...' : 'Upload'}
                      </span>
                    </label>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onAvatarRemove}
                      disabled={!avatarUrl}
                      icon={<Trash className="h-4 w-4" aria-hidden="true" />}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-text-muted" aria-hidden="true" />
                    {avatarPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Set avatar color ${color}`}
                        onClick={() => onAvatarColorChange(color)}
                        className={cn(
                          'h-6 w-6 rounded-full ring-2 transition-all duration-fast',
                          avatarColor === color ? 'ring-brand/80 scale-110' : 'ring-border-subtle/30 hover:ring-border-subtle/60',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle/15 pt-4">
                  {isAdminEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          adminForm.reset({
                            full_name: settingsData.currentUser?.full_name || '',
                            email: settingsData.currentUser?.email || '',
                            role: settingsData.currentUser?.role || 'admin',
                          });
                          setIsAdminEditing(false);
                          toast.info('Admin changes discarded');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={settings.updateAdmin.isPending}>Save</Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="secondary" onClick={() => setIsPasswordOpen(true)} icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}>
                        Change Password
                      </Button>
                      <Button type="button" onClick={enterAdminEditMode}>Edit</Button>
                    </>
                  )}
                </div>
              </form>
            )}
          </Card>

          <Card className="xl:col-span-1">
            <div className="mb-4 border-b border-border-subtle/15 pb-3">
              <h2 className="text-text-primary">Current Profile</h2>
              <p className="text-meta text-text-muted">Update domain and experience profile settings.</p>
            </div>

            {settings.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <form className="space-y-3" onSubmit={onSaveProfile}>
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted" htmlFor="profile-domain">Domain</label>
                  <Input id="profile-domain" disabled={!isProfileEditing} {...profileForm.register('domain')} />
                  {profileForm.formState.errors.domain ? <p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.domain.message}</p> : null}
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted" htmlFor="profile-title">Title</label>
                  <Input id="profile-title" disabled={!isProfileEditing} {...profileForm.register('title')} />
                  {profileForm.formState.errors.title ? <p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.title.message}</p> : null}
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <label className="text-meta text-text-muted" htmlFor="profile-exp">Experience Level</label>
                  <Input id="profile-exp" disabled={!isProfileEditing} {...profileForm.register('experience_level')} />
                  {profileForm.formState.errors.experience_level ? <p className="mt-1 text-xs text-red-300">{profileForm.formState.errors.experience_level.message}</p> : null}
                </div>

                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <p className="text-meta text-text-muted">Last Analysis</p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">{formatDate(settingsData.currentProfile?.last_analysis_at)}</p>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle/15 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={isAnalysisRunning || settings.recompute.isPending}
                    onClick={runAnalysisNow}
                    icon={<WandSparkles className="h-4 w-4" aria-hidden="true" />}
                  >
                    Recompute
                  </Button>

                  {isProfileEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          profileForm.reset({
                            domain: settingsData.currentProfile?.domain || '',
                            title: settingsData.currentProfile?.title || '',
                            experience_level: settingsData.currentProfile?.experience_level || '',
                          });
                          setIsProfileEditing(false);
                          toast.info('Profile changes discarded');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={settings.updateProfile.isPending}>Save</Button>
                    </>
                  ) : (
                    <Button type="button" onClick={enterProfileEditMode}>Edit Profile</Button>
                  )}
                </div>
              </form>
            )}
          </Card>

          <Card className="xl:col-span-1">
            <div className="mb-4 border-b border-border-subtle/15 pb-3">
              <h2 className="text-text-primary">Session</h2>
              <p className="text-meta text-text-muted">Manage active session and security controls.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-success/25 bg-success/10 px-3 py-2.5">
                <p className="text-meta text-green-200">System status</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-green-200">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
                  Online
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                <p className="text-meta text-text-muted">Unsaved changes</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{hasUnsavedChanges ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                <p className="text-meta text-text-muted">Last account update</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{formatDate(settingsData.currentUser?.updated_at)}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-border-subtle/15 pt-4">
              <Button variant="danger" onClick={openLogoutConfirm}>Logout</Button>
            </div>
          </Card>
        </section>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-border-subtle/15 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-text-primary">Recent Users</h2>
              <p className="text-meta text-text-muted">Search, view and manage user records.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-border-subtle/20 bg-app-elevated px-3 text-sm text-text-primary"
                aria-label="Filter users by role"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
              </select>
              <Badge variant="neutral">{users.data?.total || tableItems.length} users</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 z-10 bg-app-surface/95 backdrop-blur-sm">
                <tr className="text-meta uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users.isLoading || settings.isLoading)
                  ? [...Array(8)].map((_, idx) => (
                      <tr key={`skeleton-${idx}`} className="border-t border-border-subtle/10">
                        <td className="px-5 py-3"><Skeleton className="h-6 w-40" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-6 w-56" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-6 w-20" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-6 w-24" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-6 w-32" /></td>
                        <td className="px-5 py-3"><Skeleton className="ml-auto h-8 w-8" /></td>
                      </tr>
                    ))
                  : tableItems.map((user, idx) => (
                      <tr
                        key={user.id}
                        className={cn(
                          'group cursor-pointer border-t border-border-subtle/10 transition-colors duration-fast',
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                          'hover:bg-white/[0.04] hover:[box-shadow:inset_2px_0_0_0_rgba(34,211,238,0.85)]',
                        )}
                        onClick={() => setSelectedUser(user)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') setSelectedUser(user);
                        }}
                        tabIndex={0}
                        aria-label={`Open details for ${user.full_name || user.email}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/12 text-brand">
                              <User className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="text-sm font-medium text-text-primary">{user.full_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-text-secondary">{user.email || 'N/A'}</td>
                        <td className="px-5 py-3"><Badge variant={roleVariant(user.role)}>{String(user.role || 'N/A').toUpperCase()}</Badge></td>
                        <td className="px-5 py-3">
                          <Badge variant={user.status === 'disabled' ? 'warn' : 'success'}>{user.status || 'active'}</Badge>
                        </td>
                        <td className="px-5 py-3 text-sm text-text-secondary">{formatDate(user.created_at)}</td>
                        <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Tooltip content="Copy email">
                              <IconButton
                                ariaLabel={`Copy email for ${user.full_name || user.email}`}
                                onClick={() => copyEmail(user.email)}
                              >
                                <Mail className="h-4 w-4" aria-hidden="true" />
                              </IconButton>
                            </Tooltip>

                            <Dropdown
                              triggerLabel="•••"
                              ariaLabel={`Actions for ${user.full_name || user.email}`}
                              items={[
                                { label: 'View', onClick: () => setSelectedUser(user) },
                                { label: 'Set role: Admin', onClick: () => handleRoleChange(user, 'admin') },
                                { label: 'Set role: User', onClick: () => handleRoleChange(user, 'user') },
                                { label: user.status === 'disabled' ? 'Enable' : 'Disable', onClick: () => openDisableConfirm(user) },
                                { label: 'Reset password', onClick: () => handleResetPassword(user) },
                                { label: 'Delete', onClick: () => openDeleteConfirm(user) },
                              ]}
                              className="[&>button]:h-8 [&>button]:px-2.5"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!users.isLoading && tableItems.length === 0 ? (
            <div className="mx-5 mb-5 mt-3 rounded-xl border border-border-subtle/15 bg-app-elevated/60 px-4 py-8 text-center md:mx-6">
              <p className="text-sm text-text-secondary">No users found. Try another search or role filter.</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border-subtle/15 px-5 py-3 md:px-6">
            <p className="text-meta text-text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || users.isFetching}>Previous</Button>
              <Button variant="ghost" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || users.isFetching}>Next</Button>
            </div>
          </div>
        </Card>
      </div>

      <Drawer open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="User details">
        {selectedUser ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border-subtle/20 bg-app-elevated/70 p-3">
              <p className="text-meta text-text-muted">Name</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{selectedUser.full_name || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-border-subtle/20 bg-app-elevated/70 p-3">
              <p className="text-meta text-text-muted">Email</p>
              <p className="mt-1 break-all text-sm text-text-primary">{selectedUser.email || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-border-subtle/20 bg-app-elevated/70 p-3">
              <p className="text-meta text-text-muted">Role</p>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => handleRoleChange(selectedUser, 'admin')}>Set Admin</Button>
                <Button variant="ghost" onClick={() => handleRoleChange(selectedUser, 'user')}>Set User</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle/20 bg-app-elevated/70 p-3">
              <p className="text-meta text-text-muted">Created</p>
              <p className="mt-1 text-sm text-text-primary">{formatDate(selectedUser.created_at)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => openDisableConfirm(selectedUser)}>
                {selectedUser.status === 'disabled' ? 'Enable' : 'Disable'}
              </Button>
              <Button variant="danger" onClick={() => openDeleteConfirm(selectedUser)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.action === 'logout' ? 'Log out' : 'Confirm'}
        onCancel={() => setConfirmState({ open: false, action: null, title: '', description: '', target: null })}
        onConfirm={executeConfirmAction}
        loading={userActions.remove.isPending || userActions.update.isPending}
      />

      <ConfirmDialog
        open={isPasswordOpen}
        title="Change Password"
        description="Enter your current and new password to continue."
        confirmLabel="Update"
        variant="primary"
        onCancel={() => {
          setIsPasswordOpen(false);
          passwordForm.reset();
        }}
        onConfirm={onChangePassword}
        loading={settings.changePassword.isPending}
      />

      {isPasswordOpen ? (
        <div className="fixed left-1/2 top-1/2 z-[96] w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-border-subtle/20 bg-app-surface p-4 shadow-elevated">
          <form className="space-y-2">
            <Input type="password" placeholder="Current password" {...passwordForm.register('currentPassword')} />
            {passwordForm.formState.errors.currentPassword ? <p className="text-xs text-red-300">{passwordForm.formState.errors.currentPassword.message}</p> : null}
            <Input type="password" placeholder="New password" {...passwordForm.register('newPassword')} />
            {passwordForm.formState.errors.newPassword ? <p className="text-xs text-red-300">{passwordForm.formState.errors.newPassword.message}</p> : null}
            <Input type="password" placeholder="Confirm new password" {...passwordForm.register('confirmPassword')} />
            {passwordForm.formState.errors.confirmPassword ? <p className="text-xs text-red-300">{passwordForm.formState.errors.confirmPassword.message}</p> : null}
          </form>
        </div>
      ) : null}
    </motion.div>
  );
}

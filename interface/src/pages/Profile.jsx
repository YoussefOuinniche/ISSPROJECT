import React from 'react';
import { Mail, Shield, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useSettings } from '../hooks/useSettings';
import useSessionUser from '../hooks/useSessionUser';

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

export default function Profile() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user } = useSessionUser();
  const settings = useSettings();

  const currentUser = settings.data?.currentUser || {};
  const currentProfile = settings.data?.currentProfile || {};

  const displayName = user?.fullName || user?.full_name || currentUser?.full_name || 'Admin';
  const email = user?.email || currentUser?.email || '—';
  const role = user?.role || currentUser?.role || 'admin';
  const avatarUrl = user?.avatarUrl || user?.avatar_url || '';
  const avatarColor = user?.avatarColor || '#22d3ee';
  const initials = displayName
    ? displayName.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="min-h-screen bg-app px-4 pb-8 pt-6 md:px-6"
    >
      <div className="mx-auto max-w-[1100px] space-y-6">
        <header className="glass-surface rounded-panel px-5 py-4 md:px-6">
          <h1 className="text-text-primary">Profile Overview</h1>
          <p className="mt-1 text-sm text-text-secondary">Your account details, role and profile summary.</p>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-app ring-2 ring-brand/40"
                style={!avatarUrl ? { backgroundColor: avatarColor } : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <h2 className="text-lg font-semibold text-text-primary text-center">{displayName}</h2>
              <Badge variant={String(role).toLowerCase() === 'admin' ? 'brand' : 'neutral'}>{String(role).toUpperCase()}</Badge>
              <Button variant="secondary" onClick={() => navigate('/settings')}>Manage Profile</Button>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="mb-4 border-b border-border-subtle/15 pb-3">
              <h2 className="text-text-primary">Account Details</h2>
              <p className="text-meta text-text-muted">Information is synced in real time from your settings.</p>
            </div>

            {settings.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <p className="text-meta text-text-muted">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{displayName}</p>
                </div>
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <p className="text-meta text-text-muted">Email</p>
                  <p className="mt-1 break-all text-sm font-semibold text-text-primary">{email}</p>
                </div>
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <p className="text-meta text-text-muted">Role</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{String(role).toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
                  <p className="text-meta text-text-muted">Last Updated</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{formatDate(currentUser?.updated_at)}</p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-text-primary">
              <UserCircle2 className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-base font-semibold">Profile Metadata</h2>
            </div>
            {settings.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <InfoRow label="Domain" value={currentProfile?.domain || '—'} />
                <InfoRow label="Title" value={currentProfile?.title || '—'} />
                <InfoRow label="Experience" value={currentProfile?.experience_level || '—'} />
                <InfoRow label="Last Analysis" value={formatDate(currentProfile?.last_analysis_at)} />
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2 text-text-primary">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-base font-semibold">Security Snapshot</h2>
            </div>
            <div className="space-y-2">
              <InfoRow label="Session" value="Active" />
              <InfoRow label="Primary Email" value={email} icon={<Mail className="h-4 w-4" aria-hidden="true" />} />
              <InfoRow label="Permissions" value={String(role).toLowerCase() === 'admin' ? 'Full Admin' : 'Standard User'} />
            </div>
          </Card>
        </section>
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-border-subtle/15 bg-app-elevated/70 px-3 py-2.5">
      <p className="text-meta text-text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {icon ? <span className="text-text-muted">{icon}</span> : null}
        <p className="text-sm font-semibold text-text-primary break-all">{value}</p>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, LogOut, Menu, RefreshCcw, Search, Settings, UserCircle2 } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { cn } from '../utils/cn';
import Button, { IconButton } from './ui/Button';
import Dropdown from './ui/Dropdown';
import ConfirmDialog from './ui/ConfirmDialog';
import { SearchInput } from './ui/Input';
import { getNotifications, markAllNotificationsRead } from '../api/settings';
import { useToast } from './ui/Toast';
import useSessionUser from '../hooks/useSessionUser';
import './Logo3D.css';

const menuItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/users', icon: 'group', label: 'Users' },
  { path: '/content', icon: 'description', label: 'Content' },
  { path: '/analytics', icon: 'analytics', label: 'Analytics' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Layout({ children, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const reduceMotion = useReducedMotion();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const searchRef = useRef(null);

  const { user } = useSessionUser();
  const displayName = user?.fullName || user?.full_name || 'Admin';
  const initials = displayName
    ? displayName.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';
  const avatarUrl = user?.avatarUrl || user?.avatar_url || '';
  const avatarColor = user?.avatarColor || '#22d3ee';

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 1000 * 20,
    retry: 1,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifications marked as read');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update notifications');
    },
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }

      if (window.innerWidth >= 768 && window.innerWidth < 1200) {
        setIsSidebarCollapsed(true);
      } else if (window.innerWidth >= 1200) {
        setIsSidebarCollapsed(false);
      }
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const shouldBeOnline = Math.random() > 0.08;
      setIsOnline(shouldBeOnline);
    }, 12000);
    return () => window.clearInterval(interval);
  }, []);

  const unreadCount = useMemo(
    () => (notifications.data || []).filter((item) => !item.read).length,
    [notifications.data],
  );

  const isActive = (path) => location.pathname === path;

  const confirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    onLogout?.();
  };

  const refreshAllData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
    toast.info('Refreshing dashboard data');
    window.dispatchEvent(new Event('skillpulse:refresh'));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) return;
    navigate(`/users?q=${encodeURIComponent(query)}`);
    toast.info(`Searching for "${query}"`);
  };

  return (
    <div className="min-h-screen bg-app font-display">
      <header className="glass-surface fixed left-0 right-0 top-0 z-50 border-b border-border-subtle/15 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconButton ariaLabel="Toggle sidebar" onClick={() => setIsSidebarOpen((prev) => !prev)} className="lg:hidden" variant="ghost">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </IconButton>

            <button
              type="button"
              className="flex items-center gap-3"
              onClick={() => navigate('/dashboard')}
              aria-label="Go to dashboard"
            >
              <div className="logo-glow">
                <img src="/logo.png" alt="SkillPulse" className="h-10 w-auto object-contain logo-3d" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-text-primary">SkillPulse</h2>
                <p className="text-meta text-text-muted">Upskill · Adapt · Lead</p>
              </div>
            </button>
          </div>

          <form onSubmit={submitSearch} className="hidden w-[340px] xl:block">
            <SearchInput
              aria-label="Global search"
              placeholder="Search users by name/email"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="w-full"
              inputRef={searchRef}
            />
          </form>

          <div className="flex items-center gap-2 md:gap-3">
            <TooltipButton label="Focus search" onClick={() => searchRef.current?.focus()}>
              <Search className="h-4 w-4" aria-hidden="true" />
            </TooltipButton>

            <Button
              variant="ghost"
              className="hidden h-10 px-3 sm:inline-flex"
              onClick={refreshAllData}
              aria-label="Refresh all data"
              icon={<RefreshCcw className="h-4 w-4" aria-hidden="true" />}
            >
              Refresh
            </Button>

            <div className="relative">
              <TooltipButton label="Notifications" onClick={() => setIsNotificationsOpen((prev) => !prev)}>
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute right-2 top-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-danger" />
                ) : null}
              </TooltipButton>

              <AnimatePresence>
                {isNotificationsOpen ? (
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border-subtle/20 bg-app-surface p-2 shadow-elevated"
                    role="menu"
                    aria-label="Notifications panel"
                  >
                    <div className="mb-2 flex items-center justify-between px-2 py-1">
                      <p className="text-sm font-semibold text-text-primary">Notifications</p>
                      <button
                        type="button"
                        className="text-xs text-brand transition-opacity hover:opacity-80"
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending}
                      >
                        Mark all as read
                      </button>
                    </div>

                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {(notifications.data || []).length === 0 ? (
                        <p className="px-2 py-4 text-center text-sm text-text-muted">No notifications</p>
                      ) : (
                        (notifications.data || []).map((item) => (
                          <div key={item.id} className="rounded-lg border border-transparent px-2 py-2 text-sm transition-colors hover:border-border-subtle/15 hover:bg-white/[0.04]">
                            <p className={cn('font-medium', item.read ? 'text-text-secondary' : 'text-text-primary')}>{item.title}</p>
                            <p className="text-xs text-text-muted">{item.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="hidden items-center gap-3 border-l border-border-subtle/15 pl-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{displayName}</p>
                <p className="text-meta text-text-muted">Administrator</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-app shadow-[0_8px_20px_rgba(34,211,238,0.3)] ring-2 ring-brand/30"
                style={!avatarUrl ? { backgroundColor: avatarColor } : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>

            <Dropdown
              triggerLabel="Menu"
              ariaLabel="User menu"
              items={[
                { label: 'Profile', icon: <UserCircle2 className="h-4 w-4" aria-hidden="true" />, onClick: () => navigate('/profile') },
                { label: 'Settings', icon: <Settings className="h-4 w-4" aria-hidden="true" />, onClick: () => navigate('/settings') },
                { label: 'Logout', icon: <LogOut className="h-4 w-4" aria-hidden="true" />, onClick: () => setIsLogoutConfirmOpen(true) },
              ]}
            />
          </div>
        </div>
      </header>

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-[72px] z-40 border-r border-border-subtle/15 bg-gradient-to-b from-app-surface via-app-surface to-app-elevated transition-all duration-normal',
          isSidebarCollapsed ? 'w-20' : 'w-64',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        <nav className="mt-2 space-y-1 p-3">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-label={`Go to ${item.label}`}
              className={cn(
                'group relative flex items-center overflow-hidden rounded-xl px-3 py-3 transition-all duration-normal',
                isSidebarCollapsed ? 'justify-center' : 'gap-3',
                isActive(item.path)
                  ? 'border border-brand/25 bg-gradient-to-r from-brand/15 to-brand/5 text-brand shadow-[0_4px_18px_rgba(34,211,238,0.15)]'
                  : 'border border-transparent text-text-secondary hover:border-border-subtle/20 hover:bg-white/[0.04] hover:text-text-primary',
              )}
            >
              {isActive(item.path) ? <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand to-cyan-400" /> : null}
              <span className={cn('material-symbols-outlined text-xl transition-all duration-fast group-hover:scale-110', isActive(item.path) ? 'text-brand' : '')}>{item.icon}</span>
              {!isSidebarCollapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
              {!isSidebarCollapsed && isActive(item.path) ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_12px_rgba(34,211,238,0.95)]" /> : null}
            </Link>
          ))}
        </nav>

        <div className="mx-3 mt-3 rounded-xl border border-success/25 bg-success/10 p-3">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', isOnline ? 'animate-pulse bg-success' : 'bg-danger')} />
            {!isSidebarCollapsed ? (
              <span className={cn('text-xs font-medium', isOnline ? 'text-green-300' : 'text-red-300')}>
                {isOnline ? 'Platform Online' : 'Platform Offline'}
              </span>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border-subtle/15 p-3">
          <Button onClick={() => setIsLogoutConfirmOpen(true)} variant="danger" className={cn('w-full', isSidebarCollapsed ? 'justify-center px-0' : 'justify-start')}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {!isSidebarCollapsed ? 'Logout' : null}
          </Button>
        </div>
      </aside>

      <main className={cn('min-h-screen bg-app pt-[72px] transition-all duration-normal', isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {isSidebarOpen ? <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} /> : null}

      <ConfirmDialog
        open={isLogoutConfirmOpen}
        title="Log out now?"
        description="This will end your current session and redirect to login."
        confirmLabel="Log out"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}

function TooltipButton({ label, onClick, children }) {
  return (
    <IconButton ariaLabel={label} onClick={onClick} variant="ghost" className="relative">
      {children}
    </IconButton>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import './Users.css';
import AnimatedButton from '../components/ui/AnimatedButton';
import MotionCard from '../components/ui/MotionCard';
import { useUsers } from '../hooks/useUsers';

const roleColor = {
  admin:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  user:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const usersQuery = useUsers({ query: searchQuery, role: 'all', page: 1, pageSize: 500 });

  const users = usersQuery.data?.items || [];
  const loading = usersQuery.isLoading;
  const error = usersQuery.error?.message || null;

  const filteredUsers = users;

  const totalUsers = usersQuery.data?.total ?? users.length;
  const admins = users.filter((u) => u.role === 'admin').length;
  const regular = users.filter((u) => u.role !== 'admin').length;

  const getInitials = (name, email) => {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  const avatarColors = [
    'from-cyan-500 to-blue-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-emerald-600',
    'from-orange-500 to-amber-600',
    'from-rose-500 to-red-600',
    'from-indigo-500 to-violet-600',
  ];

  const loadUsers = useCallback(async () => {
    await usersQuery.refetch();
  }, [usersQuery]);

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0f1623]/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? 'Loading...' : `${totalUsers} registered accounts in the platform`}
            </p>
          </div>
          <AnimatedButton
            onClick={loadUsers}
            variant="ghost"
            className="text-slate-400"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            Refresh
          </AnimatedButton>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Users', value: totalUsers, icon: 'group', color: 'from-blue-600/20 to-blue-900/10', border: 'border-blue-500/20', icon_c: 'text-blue-400' },
            { label: 'Administrators', value: admins, icon: 'admin_panel_settings', color: 'from-orange-600/20 to-orange-900/10', border: 'border-orange-500/20', icon_c: 'text-orange-400' },
            { label: 'Regular Users', value: regular, icon: 'person', color: 'from-cyan-600/20 to-cyan-900/10', border: 'border-cyan-500/20', icon_c: 'text-cyan-400' },
          ].map((card, i) => (
            <MotionCard key={i} whileHover={{ y: -5 }} className={`rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} p-6
                                     hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className={`material-symbols-outlined text-2xl ${card.icon_c}`}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-white tabular-nums">{loading ? '—' : card.value}</p>
                </div>
              </div>
            </MotionCard>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/5 bg-[#0f1623]/80 backdrop-blur-sm overflow-hidden">
          {/* Table Header */}
          <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-bold text-white">All Users</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white
                           placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50
                           focus:bg-cyan-500/5 transition-all duration-200 w-full md:w-64 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="m-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-white/3">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      {searchQuery ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => {
                    const initials = getInitials(user.full_name, user.email);
                    const gradClass = avatarColors[index % avatarColors.length];
                    const joined = new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    });
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-white/3 hover:bg-white/3 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradClass}
                                            flex items-center justify-center text-white font-bold text-xs
                                            shadow-lg transition-transform duration-200 group-hover:scale-110`}>
                              {initials}
                            </div>
                            <p className="text-sm font-semibold text-white">{user.full_name || '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border
                                           ${roleColor[user.role] || roleColor.user}`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-slate-500">{joined}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredUsers.length > 0 && (
            <div className="px-6 py-3.5 border-t border-white/5">
              <p className="text-xs text-slate-600">
                Showing {filteredUsers.length} of {totalUsers} users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;

import React from "react";

export default function Dashboard() {
  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = "loginpage.html";
    }
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col justify-between p-4 sticky top-0 h-screen">
        <div className="flex flex-col gap-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <img src="skillpulse-logo.png" alt="logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base font-bold gradient-text">SkillPulse</h1>
              <p className="text-xs text-slate-500">Management Console</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary text-white">
              Dashboard
            </a>
            <a className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Users
            </a>
            <a className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Content
            </a>
            <a className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Analytics
            </a>
            <a className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Settings
            </a>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="text-left px-3 py-2 text-slate-500 hover:text-red-500"
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark px-8 py-4">
          <h2 className="text-xl font-bold">Overview</h2>

          <input
            type="text"
            placeholder="Search..."
            className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
          />

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Alex Rivera</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 space-y-8">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Stat title="Total Users" value="12,842" change="+12.5%" />
            <Stat title="Active Sessions" value="1,205" change="+5.2%" />
            <Stat title="New Signups" value="432" change="-2.4%" />
            <Stat title="Revenue" value="$42,500" change="+15.8%" />
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold">Users</h3>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Role</th>
                </tr>
              </thead>

              <tbody>
                <UserRow name="Michael Jordan" status="Active" role="Member" />
                <UserRow name="Anna Smith" status="Active" role="Editor" />
                <UserRow name="David Blake" status="Pending" role="Member" />
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

/* Components */

function Stat({ title, value, change }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-sm text-primary">{change}</p>
    </div>
  );
}

function UserRow({ name, status, role }) {
  return (
    <tr className="border-t">
      <td className="px-6 py-4">{name}</td>
      <td className="px-6 py-4">{status}</td>
      <td className="px-6 py-4">{role}</td>
    </tr>
  );
}

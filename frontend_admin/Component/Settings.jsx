import React, { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  /* ===================== HANDLERS ===================== */

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = "/login";
    }
  };

  const saveSettings = (section) => {
    alert(`${section} settings saved successfully!`);
  };

  const changePassword = () => {
    alert("Password changed successfully!");
  };

  const testEmail = () => {
    alert("Test email sent to admin@company.com");
  };

  /* ===================== UI ===================== */

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col justify-between p-4">

        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <img src="/skillpulse-logo.png" alt="logo" className="h-10 w-10" />
            <div>
              <h1 className="font-bold gradient-text">SkillPulse</h1>
              <p className="text-xs text-slate-500">Management Console</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <NavItem name="Dashboard" />
            <NavItem name="Users" />
            <NavItem name="Content" />
            <NavItem name="Analytics" />
            <NavItem name="Settings" active />
          </nav>
        </div>

        <button onClick={logout} className="text-left text-red-500">
          Logout
        </button>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex-1 p-8 space-y-6">

        <h2 className="text-2xl font-bold">Settings</h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* TAB NAV */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border space-y-2">
            <TabButton label="General" tab="general" activeTab={activeTab} setActiveTab={setActiveTab}/>
            <TabButton label="Security" tab="security" activeTab={activeTab} setActiveTab={setActiveTab}/>
            <TabButton label="Notifications" tab="notifications" activeTab={activeTab} setActiveTab={setActiveTab}/>
            <TabButton label="Appearance" tab="appearance" activeTab={activeTab} setActiveTab={setActiveTab}/>
            <TabButton label="Integrations" tab="integrations" activeTab={activeTab} setActiveTab={setActiveTab}/>
            <TabButton label="Advanced" tab="advanced" activeTab={activeTab} setActiveTab={setActiveTab}/>
          </div>

          {/* TAB CONTENT */}
          <div className="lg:col-span-3 space-y-6">

            {activeTab === "general" && (
              <Card title="General Settings">
                <input className="input" defaultValue="SkillPulse" />
                <input className="input" defaultValue="admin@company.com" />
                <button onClick={() => saveSettings("General")} className="btn">Save</button>
              </Card>
            )}

            {activeTab === "security" && (
              <Card title="Security Settings">
                <input type="password" className="input" placeholder="New Password"/>
                <button onClick={changePassword} className="btn">Change Password</button>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card title="Notification Settings">
                <label><input type="checkbox" defaultChecked /> Email Notifications</label>
                <button onClick={() => saveSettings("Notification")} className="btn">Save</button>
              </Card>
            )}

            {activeTab === "appearance" && (
              <Card title="Appearance Settings">
                <button className="btn">Dark Mode</button>
              </Card>
            )}

            {activeTab === "integrations" && (
              <Card title="Integrations">
                <button onClick={testEmail} className="btn">Test Email</button>
              </Card>
            )}

            {activeTab === "advanced" && (
              <Card title="Advanced">
                <label><input type="checkbox" /> Debug Mode</label>
                <button onClick={() => saveSettings("Advanced")} className="btn">Save</button>
              </Card>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function NavItem({ name, active }) {
  return (
    <div className={`px-3 py-2 rounded-lg ${active ? "bg-primary text-white" : "hover:bg-slate-100"}`}>
      {name}
    </div>
  );
}

function TabButton({ label, tab, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full px-3 py-2 rounded-lg ${
        activeTab === tab ? "bg-primary text-white" : "hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border space-y-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

import React, { useState } from "react";

export default function Content() {
  const [filter, setFilter] = useState("all");

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = "/login";
    }
  };

  const editContent = (title) => {
    alert(`Opening editor for: "${title}"`);
  };

  const deleteContent = (title) => {
    if (window.confirm(`Delete "${title}"?`)) {
      alert(`"${title}" deleted`);
    }
  };

  const contents = [
    {
      type: "article",
      title: "Getting Started with Mobile App Development",
      author: "Sarah Johnson",
      date: "Jan 24, 2024",
      status: "Published",
    },
    {
      type: "video",
      title: "App Tutorial: User Authentication",
      author: "Michael Jordan",
      date: "Feb 01, 2024",
      status: "Published",
    },
    {
      type: "image",
      title: "UI Design Mockups Collection",
      author: "Anna Smith",
      date: "Feb 05, 2024",
      status: "Draft",
    },
    {
      type: "article",
      title: "Best Practices for API Integration",
      author: "David Blake",
      date: "Jan 28, 2024",
      status: "Published",
    },
    {
      type: "video",
      title: "Database Optimization Techniques",
      author: "Emily Martinez",
      date: "Feb 03, 2024",
      status: "Draft",
    },
    {
      type: "image",
      title: "App Screenshots Gallery",
      author: "Lisa Taylor",
      date: "Jan 30, 2024",
      status: "Published",
    },
  ];

  const filtered =
    filter === "all" ? contents : contents.filter((c) => c.type === filter);

  const iconMap = {
    article: "article",
    video: "play_circle",
    image: "image",
  };

  const colorMap = {
    article: "from-blue-500 to-purple-600",
    video: "from-pink-500 to-orange-500",
    image: "from-green-500 to-teal-500",
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-[#111621] text-slate-900 dark:text-white">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111621] flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/skillpulse-logo.png" className="h-10" />
            <div>
              <h1 className="font-bold">SkillPulse</h1>
              <p className="text-xs text-slate-400">Management Console</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/users" className="nav-link">Users</a>
            <a className="nav-link bg-primary text-white">Content</a>
            <a href="/analytics" className="nav-link">Analytics</a>
            <a href="/settings" className="nav-link">Settings</a>
          </nav>
        </div>

        <button onClick={logout} className="text-red-500">
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 space-y-6">

        {/* TOP */}
        <header className="flex justify-between">
          <h2 className="text-xl font-bold">Content Management</h2>
          <button className="bg-primary text-white px-4 py-2 rounded-lg">
            New Content
          </button>
        </header>

        {/* FILTER */}
        <div className="flex gap-2">
          {["all", "article", "video", "image"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <div
              key={i}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900"
            >
              <div
                className={`h-40 bg-gradient-to-br ${colorMap[item.type]} flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-white text-6xl">
                  {iconMap[item.type]}
                </span>
              </div>

              <div className="p-4">
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 mb-3">
                  By {item.author} • {item.date}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => editContent(item.title)}
                    className="flex-1 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded text-xs"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteContent(item.title)}
                    className="bg-red-500/20 text-red-500 px-3 py-1 rounded text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

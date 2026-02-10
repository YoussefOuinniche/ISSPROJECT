import React, { useEffect, useRef } from "react";
import "../styles/analytics.css";
import Chart from "chart.js/auto";

export default function Analytics() {
  const userChartRef = useRef(null);
  const revenueChartRef = useRef(null);
  const trafficChartRef = useRef(null);

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = "/login";
    }
  };

  const exportReport = (type) => {
    alert(`Exporting ${type} report...`);
  };

  useEffect(() => {
    // User Growth Chart
    new Chart(userChartRef.current, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Active Users",
            data: [8500, 9200, 10100, 11000, 11800, 12842],
            borderColor: "#195de6",
            backgroundColor: "rgba(25,93,230,0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });

    // Revenue Chart
    new Chart(revenueChartRef.current, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue",
            data: [32000, 35000, 38000, 39500, 41000, 42500],
            backgroundColor: "#10b981",
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });

    // Traffic Pie
    new Chart(trafficChartRef.current, {
      type: "doughnut",
      data: {
        labels: ["Direct", "Organic", "Social", "Referral", "Email"],
        datasets: [
          {
            data: [35, 28, 20, 12, 5],
            backgroundColor: [
              "#195de6",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
            ],
          },
        ],
      },
    });
  }, []);

  return (
    <div className="analytics-page">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-box">
          <img src="/skillpulse-logo.png" alt="logo" />
          <h2>SkillPulse</h2>
        </div>

        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/users">Users</a>
          <a href="/content">Content</a>
          <a className="active">Analytics</a>
          <a href="/settings">Settings</a>
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="main">

        {/* TOPBAR */}
        <header className="topbar">
          <h1>Analytics & Reports</h1>

          <button onClick={() => exportReport("Analytics")}>
            Export
          </button>
        </header>

        {/* METRICS */}
        <div className="metrics">
          <div className="card">
            <p>Page Views</p>
            <h2>2.4M</h2>
          </div>

          <div className="card">
            <p>Bounce Rate</p>
            <h2>42.3%</h2>
          </div>

          <div className="card">
            <p>Avg Session</p>
            <h2>3m 24s</h2>
          </div>

          <div className="card">
            <p>Conversion</p>
            <h2>8.7%</h2>
          </div>
        </div>

        {/* CHARTS */}
        <div className="charts">

          <div className="chart-card">
            <h3>User Growth</h3>
            <canvas ref={userChartRef}></canvas>
          </div>

          <div className="chart-card">
            <h3>Revenue</h3>
            <canvas ref={revenueChartRef}></canvas>
          </div>

          <div className="chart-card">
            <h3>Traffic Sources</h3>
            <canvas ref={trafficChartRef}></canvas>
          </div>

        </div>
      </main>
    </div>
  );
}

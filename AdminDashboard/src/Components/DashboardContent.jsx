import React from "react";

// Sample data
const stats = [
  { title: "Total Users", value: "12,842" },
  { title: "Active Sessions", value: "1,205" },
  { title: "New Signups", value: "432" },
  { title: "Revenue", value: "$42,500" },
];

const activities = [
  { name: "Sarah Chen", action: "registered a new account", time: "2 minutes ago" },
  { name: "Admin_01", action: 'updated "Terms of Service"', time: "45 minutes ago" },
  { name: "John Doe", action: "purchased Premium Plan", time: "2 hours ago" },
];

const users = [
  { name: "Michael Jordan", email: "m.jordan@example.com", status: "Active", role: "Member", joined: "May 24, 2024" },
  { name: "Anna Smith", email: "anna.s@example.com", status: "Active", role: "Editor", joined: "May 22, 2024" },
];

export default function DashboardContent() {
  return (
    <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
      {/* Quick Stats */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{ flex: "1 1 200px", padding: "1rem", background: "white", borderRadius: "10px" }}>
            <h3>{stat.title}</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Recent Activity</h3>
        <ul>
          {activities.map((act, idx) => (
            <li key={idx}>
              {act.name ? `${act.name} ${act.action}` : act.action} - <span>{act.time}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Users Table */}
      <div style={{ marginTop: "2rem", background: "white", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f0f0f0" }}>
            <tr>
              <th style={{ padding: "0.5rem", textAlign: "left" }}>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.5rem" }}>{user.name}</td>
                <td>{user.status}</td>
                <td>{user.role}</td>
                <td>{user.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

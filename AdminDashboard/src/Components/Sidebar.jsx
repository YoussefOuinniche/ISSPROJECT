import React from "react";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar dark">
      <div>
        <div className="logo">
          <div className="logo-icon">
            <span className="material-symbols-outlined">dashboard_customize</span>
          </div>
          <div>
            <h1>AdminPanel</h1>
            <p>Management Console</p>
          </div>
        </div>
        <nav>
          <a href="#" className="active">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </a>
          <a href="#">
            <span className="material-symbols-outlined">group</span>
            Users
          </a>
          <a href="#">
            <span className="material-symbols-outlined">article</span>
            Content
          </a>
          <a href="#">
            <span className="material-symbols-outlined">analytics</span>
            Analytics
          </a>
          <a href="#">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </a>
        </nav>
      </div>
      <div className="logout">
        <div className="logout-item">
          <span className="material-symbols-outlined">logout</span>
          Logout
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

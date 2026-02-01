import React, { useState } from "react";
import Login from "./Components/Login";
import Sidebar from "./Components/Sidebar";
import Header from "./Components/Header";
import DashboardContent from "./Components/DashboardContent";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <div className="app-container" style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
          <Sidebar />
          <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Header />
            <DashboardContent />
          </main>
        </div>
      )}
    </>
  );
}

export default App;

import React from "react";
import "./Header.css";

function Header() {
  return (
    <header className="header dark">
      <div className="header-left">
        <h2>Overview</h2>
        <label>
          <div className="search-box">
            <span className="material-symbols-outlined">search</span>
            <input placeholder="Search users, actions or data..." type="text" />
          </div>
        </label>
      </div>

      <div className="header-right">
        <button>
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            notifications
          </span>
        </button>
        <button>
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            help
          </span>
        </button>
        <div className="divider"></div>
        <div className="profile">
          <div className="profile-info">
            <span>Alex Rivera</span>
            <span>Super Admin</span>
          </div>
          <div
            className="avatar"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAA8uehdi9a4ruLu0TsRYSYkhiBucNy_3eS5Q-Vyxacx08uwMk_iu9-0arumJL-sSNzFA3Xl7-GItUvFys4A6uvQaVypaHZ9FXMIt5LsGevbvY58oCylBJZ4WVldabUToadjlEszh35viSztOjtyceS7t4yp02hmxP58DDVX_SqA9KoPQHS52q157_V14mqVD8aOfMNQlgWl7Mx5Kz8RT6zy_xcTBLCvAfvgnv2MKHWj7zEwPlyQPvsLT_uzOPgzHCmBXywWQvxlQAF')",
            }}
          ></div>
        </div>
      </div>
    </header>
  );
}

export default Header;

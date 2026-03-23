import { useNavigate } from "react-router-dom";
import { removeToken } from "../services/auth";

export default function Topbar({ profile }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">Panel HR</div>
        {profile && (
          <div className="topbar-subtitle">
            {profile.first_name} {profile.last_name} • {profile.job_title || profile.role}
          </div>
        )}
      </div>

      <button className="topbar-logout" onClick={handleLogout}>
        Wyloguj
      </button>
    </header>
  );
}
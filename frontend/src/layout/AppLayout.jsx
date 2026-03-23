import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "../services/api";
import { removeToken } from "../services/auth";

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/me");
        setProfile(res.data);
      } catch (error) {
        removeToken();
        navigate("/login");
      }
    };

    loadProfile();
  }, [navigate]);

  return (
    <div className="app-layout">
      <Sidebar profile={profile} />

      <div className="app-main">
        <Topbar profile={profile} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
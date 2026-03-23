import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { removeToken } from "../services/auth";
import WorkHoursChart from "../components/WorkHoursChart";
import RecentLeaves from "../components/RecentLeaves";

export default function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);

  const workHoursData = [
    { day: "Pon", hours: 8 },
    { day: "Wt", hours: 7 },
    { day: "Śr", hours: 5 },
    { day: "Czw", hours: 0 },
    { day: "Pt", hours: 8 },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, summaryRes, historyRes] = await Promise.all([
          api.get("/me"),
          api.get("/leave_requests/summary"),
          api.get("/leave_requests/history"),
        ]);

        setProfile(profileRes.data);
        setSummary(summaryRes.data);
        setRecentLeaves(historyRes.data.slice(0, 5));
      } catch (error) {
        removeToken();
        navigate("/login");
      }
    };

    loadData();
  }, [navigate]);

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>

      {profile && (
        <div className="welcome-card">
          <h2>Witaj, {profile.first_name}</h2>
          <p>{profile.job_title || profile.role}</p>
          <p>Dział: {profile.department}</p>
        </div>
      )}

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <span>Wszystkie wnioski</span>
            <strong>{summary.total_requests}</strong>
          </div>
          <div className="summary-card">
            <span>Zaakceptowane</span>
            <strong>{summary.approved_requests}</strong>
          </div>
          <div className="summary-card">
            <span>Oczekujące</span>
            <strong>{summary.pending_requests}</strong>
          </div>
          <div className="summary-card">
            <span>Dni urlopu</span>
            <strong>{summary.total_approved_days}</strong>
          </div>
        </div>
      )}

      <WorkHoursChart data={workHoursData} />

      <RecentLeaves leaves={recentLeaves} />
    </div>
  );
}
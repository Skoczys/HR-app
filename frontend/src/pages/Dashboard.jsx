import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { removeToken } from "../services/auth";
import WorkHoursChart from "../components/WorkHoursChart";
import RecentLeaves from "../components/RecentLeaves";

const leaveTypeClassMap = {
  wypoczynkowy: "calendar-event-vacation",
  na_zadanie: "calendar-event-demand",
  chorobowe: "calendar-event-sick",
  okolicznosciowy: "calendar-event-occasion",
  bezplatny: "calendar-event-unpaid",
};

const leaveTypeLabels = {
  wypoczynkowy: "Urlop wypoczynkowy",
  na_zadanie: "Na żądanie",
  chorobowe: "Chorobowe",
  okolicznosciowy: "Okolicznościowy",
  bezplatny: "Bezpłatny",
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [managerSummary, setManagerSummary] = useState(null);

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

        const role = profileRes.data?.role;

        if (["kierownik", "admin", "kadry", "zarzad"].includes(role)) {
          const managerSummaryRes = await api.get("/manager/dashboard-summary");
          setManagerSummary(managerSummaryRes.data);
        }
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

      {managerSummary && (
        <>
          <div className="summary-grid">
            <div className="summary-card clickable" onClick={() => navigate("/users")}>
              <span>Członkowie zespołu</span>
              <strong>{managerSummary.team_count}</strong>
            </div>

            <div className="summary-card clickable" onClick={() => navigate("/leave/pending")}>
              <span>Wnioski do akceptacji</span>
              <strong>{managerSummary.pending_requests_count}</strong>
            </div>

            <div className="summary-card clickable" onClick={() => navigate("/team-calendar")}>
              <span>Dziś nieobecni</span>
              <strong>{managerSummary.today_absences.length}</strong>
            </div>

            <div className="summary-card clickable" onClick={() => navigate("/team-calendar")}>
              <span>Jutro nieobecni</span>
              <strong>{managerSummary.tomorrow_absences.length}</strong>
            </div>
          </div>

          <div className="dashboard-manager-grid">
            {/* DZISIAJ */}
            <div className="dashboard-list-card">
              <h3>Dziś nieobecni</h3>

              {managerSummary.today_absences.length === 0 ? (
                <p className="section-muted">Brak nieobecności</p>
              ) : (
                <div className="dashboard-simple-list">
                  {managerSummary.today_absences.map((item) => (
                    <div
                          key={item.id}
                          className="dashboard-simple-list-item clickable"
                          onClick={() => navigate(`/users/${item.employee_id}`)}
                        >
                      <strong>{item.employee_name}</strong>

                      <span
                        className={`calendar-event-pill ${
                          leaveTypeClassMap[item.leave_type] || ""
                        }`}
                      >
                        {leaveTypeLabels[item.leave_type] || item.leave_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JUTRO */}
            <div className="dashboard-list-card">
              <h3>Jutro nieobecni</h3>

              {managerSummary.tomorrow_absences.length === 0 ? (
                <p className="section-muted">Brak nieobecności</p>
              ) : (
                <div className="dashboard-simple-list">
                  {managerSummary.tomorrow_absences.map((item) => (
                    <div
                      key={item.id}
                      className="dashboard-simple-list-item clickable"
                        onClick={() => navigate(`/users/${item.employee_id}`)}
>
                      <strong>{item.employee_name}</strong>

                      <span
                        className={`calendar-event-pill ${
                          leaveTypeClassMap[item.leave_type] || ""
                        }`}
                      >
                        {leaveTypeLabels[item.leave_type] || item.leave_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRZYSZŁE */}
          <div className="dashboard-list-card" style={{ marginTop: "20px" }}>
            <h3>Najbliższe zaplanowane nieobecności</h3>

            {managerSummary.upcoming_absences.length === 0 ? (
              <p className="section-muted">Brak zaplanowanych nieobecności</p>
            ) : (
              <div className="dashboard-simple-list">
                {managerSummary.upcoming_absences.map((item) => (
                  <div
  key={item.id}
  className="dashboard-simple-list-item dashboard-simple-list-item-column clickable"
  onClick={() => navigate(`/users/${item.employee_id || item.user_id}`)}
>
                    <strong>{item.employee_name}</strong>

                    <span
                      className={`calendar-event-pill ${
                        leaveTypeClassMap[item.leave_type] || ""
                      }`}
                    >
                      {leaveTypeLabels[item.leave_type] || item.leave_type}
                    </span>

                    <span>
                      {item.start_date} → {item.end_date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <WorkHoursChart data={workHoursData} />
      <RecentLeaves leaves={recentLeaves} />
    </div>
  );
}
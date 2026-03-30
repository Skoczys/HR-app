import { useEffect, useState } from "react";
import api from "../services/api";

export default function MyProfilePage() {
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
  });

  const [savingPassword, setSavingPassword] = useState(false);

  const currentYear = new Date().getFullYear();

  const loadData = async () => {
    try {
      const profileRes = await api.get("/me");
      setProfile(profileRes.data);

      try {
        const balanceRes = await api.get(`/leave_balance/me?year=${currentYear}`);
        setBalance(balanceRes.data);
      } catch {
        setBalance(null);
      }
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać danych.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePassword = async () => {
    setSavingPassword(true);
    setError("");

    try {
      await api.patch("/me/change-password", passwordForm);

      alert("Hasło zmienione!");

      setPasswordForm({
        old_password: "",
        new_password: "",
      });
    } catch (err) {
      console.error(err);
      setError("Nie udało się zmienić hasła.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) {
    return <div className="section-muted">Ładowanie...</div>;
  }

  return (
    <div className="user-details-page">
      <h1 className="page-title">Mój profil</h1>

      {error && <div className="auth-error">{error}</div>}

      <div className="user-details-grid">
        <div className="user-details-card">
          <h3>Dane</h3>

          <div className="user-details-list">
            <div className="user-details-row">
              <strong>Imię</strong>
              <span>{profile.first_name}</span>
            </div>

            <div className="user-details-row">
              <strong>Nazwisko</strong>
              <span>{profile.last_name}</span>
            </div>

            <div className="user-details-row">
              <strong>Email</strong>
              <span>{profile.email}</span>
            </div>

            <div className="user-details-row">
              <strong>Dział</strong>
              <span>{profile.department}</span>
            </div>

            <div className="user-details-row">
              <strong>Stanowisko</strong>
              <span>{profile.job_title || "-"}</span>
            </div>
          </div>
        </div>

        <div className="user-details-card">
          <h3>Saldo urlopowe ({currentYear})</h3>

          {balance ? (
            <div className="user-details-list">
              <div className="user-details-row user-details-row-highlight">
                <strong>Pozostało</strong>
                <span>{balance.remaining_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Wykorzystane</strong>
                <span>{balance.used_days} dni</span>
              </div>
            </div>
          ) : (
            <div className="section-muted">
              Brak salda urlopowego
            </div>
          )}
        </div>
      </div>

      <div className="user-details-card">
        <h3>Zmień hasło</h3>

        <div className="form-grid">
          <div>
            <label>Aktualne hasło</label>
            <input
              type="password"
              value={passwordForm.old_password}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, old_password: e.target.value })
              }
            />
          </div>

          <div>
            <label>Nowe hasło</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, new_password: e.target.value })
              }
            />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: "20px" }}>
          <button
            className="primary-button"
            onClick={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? "Zapisywanie..." : "Zmień hasło"}
          </button>
        </div>
      </div>
    </div>
  );
}
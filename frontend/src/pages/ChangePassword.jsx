import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearMustChangePassword, removeToken } from "../services/auth";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== repeatPassword) {
      setError("Nowe hasła nie są takie same");
      return;
    }

    setLoading(true);

    try {
      await api.patch("/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      clearMustChangePassword();
      navigate("/dashboard");
    } catch (err) {
      setError("Nie udało się zmienić hasła");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Zmień hasło</h1>
        <p className="auth-subtitle">
          To hasło zostało zresetowane. Ustaw swoje własne hasło, aby przejść dalej.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Aktualne hasło</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />

          <label>Nowe hasło</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <label>Powtórz nowe hasło</label>
          <input
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Zapisywanie..." : "Zmień hasło"}
          </button>
        </form>

        <div style={{ marginTop: "14px" }}>
          <button className="secondary-button" onClick={handleLogout}>
            Wyloguj
          </button>
        </div>
      </div>
    </div>
  );
}
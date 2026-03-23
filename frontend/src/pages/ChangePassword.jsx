import { useState } from "react";
import api from "../services/api";
import { clearMustChangePassword, removeToken } from "../services/auth";
import famakMark from "../assets/Floader.png";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !repeatPassword) {
      setError("Uzupełnij wszystkie pola");
      return;
    }

    if (newPassword.length < 6) {
      setError("Nowe hasło musi mieć co najmniej 6 znaków");
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("Nowe hasła nie są takie same");
      return;
    }

    if (oldPassword === newPassword) {
      setError("Nowe hasło musi być inne niż aktualne");
      return;
    }

    setLoading(true);

    try {
      await api.patch("/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      clearMustChangePassword();
      setSuccess("Hasło zostało zmienione. Trwa przekierowanie...");

      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 900);
    } catch (err) {
      console.error(err);

      const backendMessage =
        err?.response?.data?.detail || "Nie udało się zmienić hasła";

      setError(
        typeof backendMessage === "string"
          ? backendMessage
          : "Nie udało się zmienić hasła"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    window.location.replace("/login");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-lockup">
          <div className="brand-mark-box">
            <img src={famakMark} alt="FAMAK" className="brand-mark-image" />
          </div>
          <div>
            <h1>Zmień hasło</h1>
            <p className="auth-subtitle">
              To konto wymaga ustawienia nowego hasła przed wejściem do systemu.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Aktualne hasło</label>
          <input
            type="password"
            placeholder="Wpisz aktualne hasło"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />

          <label>Nowe hasło</label>
          <input
            type="password"
            placeholder="Wpisz nowe hasło"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <label>Powtórz nowe hasło</label>
          <input
            type="password"
            placeholder="Powtórz nowe hasło"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

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
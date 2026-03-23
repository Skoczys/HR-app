import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { saveToken, setMustChangePassword } from "../services/auth";
import FLoader from "../components/FLoader";
import famakMark from "../assets/Floader.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      saveToken(response.data.access_token);
      setMustChangePassword(response.data.must_change_password);

      setTimeout(() => {
        if (response.data.must_change_password) {
          navigate("/change-password");
        } else {
          navigate("/dashboard");
        }
      }, 1100);
      
    } catch (err) {
      setLoading(false);
      setError("Nieprawidłowy email lub hasło");
    }
  };

  return (
    <div className="auth-page">
      <div className={`auth-card ${loading ? "auth-card-loading" : ""}`}>
        {!loading ? (
          <>
            <div className="brand-lockup">
              <div className="brand-mark-box">
                <img src={famakMark} alt="FAMAK" className="brand-mark-image" />
              </div>
              <div>
                <h1>Logowanie</h1>
                <p className="auth-subtitle">Zaloguj się do panelu HR</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <label>Email</label>
              <input
                type="email"
                placeholder="twoj.email@famak.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label>Hasło</label>
              <input
                type="password"
                placeholder="Wpisz hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" disabled={loading}>
                Zaloguj
              </button>
            </form>
          </>
        ) : (
          <FLoader />
        )}
      </div>
    </div>
  );
}
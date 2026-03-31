import { Link } from "react-router-dom";

export default function Sidebar({ profile }) {
  const role = profile?.role;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">FAMAK HR</div>

      <nav className="sidebar-nav">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/leave">Wnioski</Link>
        <Link to="/my-profile">Mój profil</Link>
        <Link to="/my-documents">Moje dokumenty</Link>

        {(role === "kierownik" ||
          role === "kadry" ||
          role === "zarzad" ||
          role === "admin") && <Link to="/leave/pending">Do akceptacji</Link>}

        {(role === "kierownik" ||
          role === "kadry" ||
          role === "zarzad" ||
          role === "admin") && (
          <Link to="/team-calendar">Kalendarz zespołu</Link>
        )}

        {(role === "kierownik" ||
          role === "kadry" ||
          role === "zarzad" ||
          role === "admin") && (
          <Link to="/users">Pracownicy</Link>
        )}
      </nav>
    </aside>
  );
}
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      <header className="navbar">
        <Link to="/" className="navbar-title">
          DPI Intelligent — NovaSanté Lab
        </Link>
        {user && (
          <div className="navbar-user">
            <span>
              {user.nom} ({user.role})
            </span>
            <button onClick={handleLogout}>Déconnexion</button>
          </div>
        )}
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

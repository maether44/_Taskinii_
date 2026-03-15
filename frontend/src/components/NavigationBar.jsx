import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Download } from "lucide-react";
// import ProfileIcon from './ProfileIcon';

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/activity", label: "Activity" },
  { to: "/nutrition", label: "Nutrition" },
  { to: "/insights", label: "AI Insights" },
];

export default function NavigationBar() {
  const location = useLocation();

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem clamp(1rem, 5vw, 3rem)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(36, 28, 64, 0.85)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Link
        to="/"
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--color-accent-lime)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            width: "24px",
            height: "24px",
            background: "var(--color-accent-lime)",
            borderRadius: "50%",
          }}
        />
        BodyQ
      </Link>

      <div
        className="desktop-menu"
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              color:
                location.pathname === to ? "var(--color-accent-lime)" : "white",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* <ProfileIcon /> */}
        <a
          href="#install"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.2rem",
            fontSize: "0.95rem",
            fontWeight: 700,
            borderRadius: "50px",
            background: "var(--color-accent-lime)",
            color: "var(--color-background)",
            textDecoration: "none",
          }}
        >
          <Download size={18} />
          Install App
        </a>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

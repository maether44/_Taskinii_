import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, login, saveToken, saveUser } from "../services/auth";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      // Auto-login then redirect to dashboard
      const { data } = await login({ email: form.email, password: form.password });
      saveToken(data.token);
      saveUser(data.user);
      navigate("/dashboard");           // ← goes straight to dashboard
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* LEFT — branding panel */}
      <div className="auth-visual">
        <div className="auth-logo">BodyQ</div>
        <div className="auth-visual-content">
          <h1>Start your<br /><span>journey.</span></h1>
          <p>Join thousands of athletes tracking their progress with BodyQ every day.</p>
          <div className="auth-stats">
            <div className="stat">
              <span className="stat-num">12K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat">
              <span className="stat-num">98%</span>
              <span className="stat-label">Satisfaction</span>
            </div>
            <div className="stat">
              <span className="stat-num">50+</span>
              <span className="stat-label">Metrics</span>
            </div>
          </div>
        </div>
        <div className="auth-visual-bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">

          <button onClick={() => navigate(-1)} className="auth-back-btn">
            ← Back
          </button>

          <div className="auth-form-header">
            <h2>Create account</h2>
            <p>Let's get you started.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                name="confirm"
                placeholder="••••••••"
                value={form.confirm}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : "Sign Up →"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
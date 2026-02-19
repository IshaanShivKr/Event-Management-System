import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getApiErrorMessage } from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    collegeOrOrg: "",
    phone: "",
    participantType: "IIIT",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Participant Register</h2>
        {error && <p>{error}</p>}

        <form onSubmit={onSubmit}>
          <select className="input" name="participantType" value={form.participantType} onChange={onChange}>
            <option value="IIIT">IIIT</option>
            <option value="NON_IIIT">Non-IIIT</option>
          </select>
          <input className="input" name="firstName" placeholder="First name" value={form.firstName} onChange={onChange} required />
          <input className="input" name="lastName" placeholder="Last name" value={form.lastName} onChange={onChange} required />
          <input className="input" name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} required />
          <input className="input" name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} required />
          <input className="input" name="collegeOrOrg" placeholder="College / Organization" value={form.collegeOrOrg} onChange={onChange} required />
          <input className="input" name="phone" placeholder="Phone" value={form.phone} onChange={onChange} required />

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="muted">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;

import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
        const response = await api.post("/auth/login", {
            email,
            password,
        });

        if (response.data.success) {
            const { accessToken, refreshToken, role, user } =
            response.data.data;

            login({ accessToken, refreshToken, role, user });

            if (role === "Participant") navigate("/participant/dashboard");
            else if (role === "Organizer") navigate("/organizer/dashboard");
            else if (role === "Admin") navigate("/admin/dashboard");
        }
        } catch (err) {
        setError(
            err.response?.data?.message || "Login failed"
        );
        }
    };

    return (
        <div>
        <h2>Login</h2>
        {error && <p>{error}</p>}
        <form onSubmit={handleSubmit}>
            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
            <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            />
            <button type="submit">Login</button>
        </form>
        </div>
    );
}

export default Login;

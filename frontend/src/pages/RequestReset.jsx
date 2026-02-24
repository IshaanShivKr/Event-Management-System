import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../services/api";

function RequestReset() {
    const [email, setEmail] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg("");
        setErrorMsg("");
        setLoading(true);

        try {
            const response = await api.post("/auth/request-reset", { email, reason });
            setSuccessMsg(response.data?.message || "Password reset request sent successfully.");
            setEmail("");
            setReason("");
        } catch (err) {
            setErrorMsg(getApiErrorMessage(err, "Failed to submit request"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="card auth-card">
                <h2>Request Password Reset</h2>
                <p className="muted" style={{ marginBottom: "20px" }}>
                    This feature is only available for Organizers. An Admin will review your request.
                </p>

                {successMsg && <p style={{ color: "green", marginBottom: "15px" }}>{successMsg}</p>}
                {errorMsg && <p style={{ color: "red", marginBottom: "15px" }}>{errorMsg}</p>}

                <form onSubmit={handleSubmit}>
                    <input
                        className="input"
                        type="email"
                        placeholder="Account Email *"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <textarea
                        className="input"
                        placeholder="Reason (optional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows="3"
                    />
                    <button className="button" type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Request"}
                    </button>
                </form>

                <p className="muted" style={{ marginTop: "20px", textAlign: "center" }}>
                    <Link to="/login">← Back to Login</Link>
                </p>
            </div>
        </div>
    );
}

export default RequestReset;

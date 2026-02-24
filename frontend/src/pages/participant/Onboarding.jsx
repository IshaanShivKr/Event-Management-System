import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

const AVAILABLE_INTERESTS = [
    "Coding",
    "Design",
    "Music",
    "Dance",
    "Robotics",
    "Gaming",
    "Literature",
    "Photography",
    "Sports",
    "Business & Management"
];

function Onboarding() {
    const navigate = useNavigate();
    const [organizers, setOrganizers] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedClubs, setSelectedClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchOrganizers();
    }, []);

    const fetchOrganizers = async () => {
        try {
            const response = await api.get("/users/organizer");
            if (response.data.success) {
                setOrganizers(response.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch organizers:", err);
            // We don't fail the whole onboarding if only organizers fail to load
        } finally {
            setLoading(false);
        }
    };

    const toggleInterest = (interest) => {
        setSelectedInterests((prev) =>
            prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
        );
    };

    const toggleClub = (clubId) => {
        setSelectedClubs((prev) =>
            prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");

        try {
            await api.put("/users/profile", {
                interests: selectedInterests,
                followedClubs: selectedClubs
            });
            navigate("/participant/dashboard");
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to save preferences"));
            setSaving(false);
        }
    };

    const handleSkip = () => {
        navigate("/participant/dashboard");
    };

    if (loading) return <div className="page-container"><p>Loading preferences setup...</p></div>;

    return (
        <div className="page-container" style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
            <div className="card">
                <h2 style={{ marginBottom: "0.5rem" }}>Welcome to Felicity! 🎉</h2>
                <p className="muted" style={{ marginBottom: "2rem" }}>
                    Let's personalize your experience. You can always change these later in your Profile.
                </p>

                {error && <p className="error-message" style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

                {/* Interests Selection */}
                <div style={{ marginBottom: "2rem" }}>
                    <h3>Areas of Interest</h3>
                    <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Select the topics you are interested in.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {AVAILABLE_INTERESTS.map((interest) => (
                            <button
                                key={interest}
                                onClick={() => toggleInterest(interest)}
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "20px",
                                    border: selectedInterests.includes(interest) ? "2px solid #007bff" : "1px solid #ddd",
                                    backgroundColor: selectedInterests.includes(interest) ? "#e7f1ff" : "white",
                                    color: selectedInterests.includes(interest) ? "#007bff" : "#333",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {interest}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clubs Selection */}
                <div style={{ marginBottom: "2rem" }}>
                    <h3>Clubs to Follow</h3>
                    <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Follow clubs to stay updated on their events.</p>
                    {organizers.length === 0 ? (
                        <p className="muted">No clubs available right now.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto", border: "1px solid #eee", padding: "1rem", borderRadius: "8px" }}>
                            {organizers.map((org) => (
                                <label key={org._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem", borderRadius: "4px", backgroundColor: selectedClubs.includes(org._id) ? "#f8f9fa" : "transparent" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedClubs.includes(org._id)}
                                        onChange={() => toggleClub(org._id)}
                                        style={{ width: "18px", height: "18px" }}
                                    />
                                    <div>
                                        <strong>{org.organizerName}</strong>
                                        <div style={{ fontSize: "0.8rem", color: "#666" }}>{org.category}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
                    <button
                        onClick={handleSkip}
                        disabled={saving}
                        style={{ padding: "0.75rem 1.5rem", backgroundColor: "transparent", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                    >
                        Skip for now
                    </button>
                    <button
                        className="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ padding: "0.75rem 1.5rem", minWidth: "150px" }}
                    >
                        {saving ? "Saving..." : "Save & Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;

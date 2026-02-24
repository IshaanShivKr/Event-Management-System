import { useEffect, useState, useContext } from "react";
import api, { getApiErrorMessage } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { Link } from "react-router-dom";

function TeamDashboard() {
    const { user } = useContext(AuthContext);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const res = await api.get("/teams/my-teams");
            setTeams(res.data?.data?.teams || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load teams"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    return (
        <div className="page">
            <h2>My Teams Dashboard</h2>
            <p className="muted">Manage your event teams, invite members, and check completion status.</p>

            {error && <p className="alert alert-danger">{error}</p>}

            {loading ? (
                <p>Loading teams...</p>
            ) : teams.length === 0 ? (
                <div className="card text-center">
                    <p>You are not part of any teams yet.</p>
                    <Link to="/participant/events" className="button" style={{ display: 'inline-block', marginTop: '10px' }}>
                        Browse Events
                    </Link>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {teams.map((team) => {
                        const isLeader = team.leaderId === user?.id;
                        return (
                            <div key={team._id} className="card" style={{ borderLeft: `5px solid ${team.status === 'Completed' ? '#4caf50' : '#ff9800'}` }}>
                                <h3>{team.name} <span style={{ fontSize: "0.6em", padding: "3px 8px", borderRadius: "10px", backgroundColor: team.status === 'Completed' ? '#4caf50' : '#ff9800', color: "white", verticalAlign: "middle" }}>{team.status}</span></h3>
                                <p><strong>Event:</strong> {team.eventId?.name}</p>
                                <p><strong>Role:</strong> {isLeader ? "Team Leader" : "Member"}</p>
                                <p><strong>Members:</strong> {team.members.length} / {team.maxSize}</p>

                                {team.status === "Forming" && (
                                    <div style={{ marginTop: "15px", backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "5px" }}>
                                        <p style={{ margin: 0, fontWeight: "bold" }}>Invite Code: <span style={{ fontFamily: "monospace", fontSize: "1.2em", padding: "2px 5px", backgroundColor: "#e0e0e0", borderRadius: "3px" }}>{team.inviteCode}</span></p>
                                        <p style={{ margin: "5px 0 0 0", fontSize: "0.9em", color: "#666" }}>Share this code with your teammates. Registration tickets will be generated automatically once {team.maxSize} members join.</p>
                                    </div>
                                )}

                                {team.status === "Completed" && (
                                    <div style={{ marginTop: "15px", backgroundColor: "#e8f5e9", padding: "10px", borderRadius: "5px", color: "#2e7d32" }}>
                                        <p style={{ margin: 0, fontWeight: "bold" }}>Team is fully formed!</p>
                                        <p style={{ margin: "5px 0 0 0", fontSize: "0.9em" }}>Your event tickets have been sent to your email and are available in your Registrations tab.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default TeamDashboard;

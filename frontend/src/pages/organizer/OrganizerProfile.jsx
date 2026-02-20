import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

function OrganizerProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/users/me");
        setProfile(response.data?.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load profile"));
      }
    };
    fetchProfile();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put("/users/profile", {
        organizerName: profile.organizerName,
        category: profile.category,
        description: profile.description,
        contactEmail: profile.contactEmail,
        phone: profile.phone,
        discordWebhookUrl: profile.discordWebhookUrl || "",
      });
      alert("Profile updated");
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update profile"));
    }
  };

  const requestReset = async () => {
    try {
      await api.post("/users/request-reset", { reason: "Organizer reset request from profile" });
      alert("Password reset request sent to admin");
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to request reset"));
    }
  };

  if (!profile) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  return (
    <div className="page">
      <h2>Organizer Profile</h2>
      <form className="card" onSubmit={saveProfile}>
        <input className="input" value={profile.organizerName || ""} onChange={(e) => setProfile((p) => ({ ...p, organizerName: e.target.value }))} />
        <select className="input" value={profile.category || "CLUB"} onChange={(e) => setProfile((p) => ({ ...p, category: e.target.value }))}>
          <option value="CLUB">CLUB</option>
          <option value="COUNCIL">COUNCIL</option>
          <option value="FEST_TEAM">FEST_TEAM</option>
        </select>
        <textarea className="input" value={profile.description || ""} onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} />
        <input className="input" value={profile.contactEmail || ""} onChange={(e) => setProfile((p) => ({ ...p, contactEmail: e.target.value }))} />
        <input className="input" value={profile.phone || ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
        <input className="input" value={profile.discordWebhookUrl || ""} onChange={(e) => setProfile((p) => ({ ...p, discordWebhookUrl: e.target.value }))} placeholder="Discord webhook URL" />
        <p className="muted">Login email (non-editable): {profile.email}</p>
        <button className="button" type="submit">Save Profile</button>
      </form>

      <div className="card">
        <h3>Admin Reset Request</h3>
        <button className="button button-secondary" onClick={requestReset}>Request Password Reset from Admin</button>
      </div>
    </div>
  );
}

export default OrganizerProfile;


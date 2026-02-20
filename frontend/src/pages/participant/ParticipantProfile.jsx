import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

function ParticipantProfile() {
  const [profile, setProfile] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [profileRes, clubsRes] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/organizer"),
      ]);
      setProfile(profileRes.data?.data);
      setOrganizers(clubsRes.data?.data || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load profile"));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put("/users/profile", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        collegeOrOrg: profile.collegeOrOrg,
        interests: profile.interests || [],
        followedClubs: profile.followedClubs || [],
      });
      alert("Profile updated");
      fetchData();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update profile"));
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/users/update-password", passwordForm);
      setPasswordForm({ oldPassword: "", newPassword: "" });
      alert("Password updated");
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update password"));
    }
  };

  if (!profile) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  const followedOrganizers = organizers.filter((org) => (profile.followedClubs || []).includes(org._id));

  return (
    <div className="page">
      <h2>Profile</h2>
      <form className="card" onSubmit={updateProfile}>
        <h3>Edit Profile</h3>
        <input className="input" value={profile.firstName || ""} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
        <input className="input" value={profile.lastName || ""} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
        <input className="input" value={profile.phone || ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
        <input className="input" value={profile.collegeOrOrg || ""} onChange={(e) => setProfile((p) => ({ ...p, collegeOrOrg: e.target.value }))} />
        <input
          className="input"
          placeholder="Interests (comma separated)"
          value={(profile.interests || []).join(", ")}
          onChange={(e) => setProfile((p) => ({ ...p, interests: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
        />
        <p className="muted">Email: {profile.email} (non-editable)</p>
        <p className="muted">Participant Type: {profile.participantType} (non-editable)</p>

        <h4>Followed Clubs</h4>
        {followedOrganizers.length > 0 ? (
          <ul style={{ marginLeft: "1.5rem" }}>
            {followedOrganizers.map((org) => (
              <li key={org._id}>{org.organizerName}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Not following any clubs currently.</p>
        )}

        <button className="button" type="submit" style={{ marginTop: "1rem" }}>Save Profile</button>
      </form>

      <form className="card" onSubmit={updatePassword}>
        <h3>Change Password</h3>
        <input
          className="input"
          type="password"
          placeholder="Current password"
          value={passwordForm.oldPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="New password"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
          required
        />
        <button className="button" type="submit">Update Password</button>
      </form>
    </div>
  );
}

export default ParticipantProfile;

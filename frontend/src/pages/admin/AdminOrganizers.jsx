import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

const emptyForm = {
  organizerName: "",
  category: "CLUB",
  description: "",
  contactEmail: "",
  phone: "",
};

function AdminOrganizers() {
  const [form, setForm] = useState(emptyForm);
  const [organizers, setOrganizers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");

  const fetchOrganizers = async () => {
    try {
      const response = await api.get("/admin/organizers", {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      setOrganizers(response.data?.data || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load organizers"));
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const createOrganizer = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/admin/organizers", form);
      setCredentials(response.data?.data?.credentials);
      setForm(emptyForm);
      fetchOrganizers();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to create organizer"));
    }
  };

  const updateAccountState = async (organizerId, action) => {
    try {
      await api.patch(`/admin/organizers/${organizerId}/account-state`, { action });
      fetchOrganizers();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update state"));
    }
  };

  const permanentDelete = async (organizerId) => {
    if (!window.confirm("Permanently delete organizer and related events?")) return;
    try {
      await api.delete(`/admin/organizers/${organizerId}/permanent`);
      fetchOrganizers();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to delete organizer"));
    }
  };

  return (
    <div className="page">
      <h2>Manage Clubs / Organizers</h2>
      {error && <p>{error}</p>}

      <form className="card" onSubmit={createOrganizer}>
        <h3>Create Organizer</h3>
        <input className="input" placeholder="Organizer name" value={form.organizerName} onChange={(e) => setForm((p) => ({ ...p, organizerName: e.target.value }))} required />
        <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
          <option value="CLUB">CLUB</option>
          <option value="COUNCIL">COUNCIL</option>
          <option value="FEST_TEAM">FEST_TEAM</option>
        </select>
        <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
        <input className="input" type="email" placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} required />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        <button className="button" type="submit">Create</button>
      </form>

      {credentials && (
        <div className="card">
          <h3>Generated Credentials</h3>
          <p>Login Email: <code>{credentials.loginEmail}</code></p>
          <p>Temporary Password: <code>{credentials.temporaryPassword}</code></p>
        </div>
      )}

      <div className="card grid-3">
        <input className="input" placeholder="Search name/email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button className="button button-secondary" onClick={fetchOrganizers}>Apply</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Login Email</th>
              <th>Contact Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map((org) => (
              <tr key={org._id}>
                <td>{org.organizerName}</td>
                <td>{org.category}</td>
                <td>{org.email}</td>
                <td>{org.contactEmail}</td>
                <td>{org.accountStatus || "ACTIVE"}</td>
                <td>
                  <div className="inline">
                    <button className="button button-secondary" onClick={() => updateAccountState(org._id, "disable")}>Disable</button>
                    <button className="button button-secondary" onClick={() => updateAccountState(org._id, "enable")}>Enable</button>
                    <button className="button button-secondary" onClick={() => updateAccountState(org._id, "archive")}>Archive</button>
                    <button className="button button-danger" onClick={() => permanentDelete(org._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!organizers.length && (
              <tr>
                <td colSpan="6">No organizers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminOrganizers;

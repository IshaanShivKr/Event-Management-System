import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

function AdminPasswordResets() {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);

  const fetchRows = async () => {
    try {
      const response = await api.get("/admin/password-reset-requests", { params: { status } });
      setRows(response.data?.data || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load requests"));
    }
  };

  useEffect(() => {
    fetchRows();
  }, [status]);

  const resolve = async (id, action) => {
    const comment = window.prompt("Optional comment") || "";
    try {
      const response = await api.patch(`/admin/password-reset-requests/${id}`, { action, comment });
      if (action === "approve") setGenerated(response.data?.data);
      fetchRows();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update request"));
    }
  };

  return (
    <div className="page">
      <h2>Password Reset Requests</h2>
      {error && <p>{error}</p>}

      <div className="card inline">
        <label>Status:</label>
        <select className="input small" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {generated && (
        <div className="card">
          <h3>Approved Credentials</h3>
          <p>Organizer: {generated.organizerName}</p>
          <p>Login Email: <code>{generated.loginEmail}</code></p>
          <p>Temporary Password: <code>{generated.temporaryPassword}</code></p>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Organizer</th>
              <th>Login</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td>{row.organizerName}</td>
                <td>{row.email}</td>
                <td>{row.resetReason}</td>
                <td>{row.resetRequestStatus || (row.resetRequested ? "Pending" : "None")}</td>
                <td>{row.resetRequestedAt ? new Date(row.resetRequestedAt).toLocaleString() : "-"}</td>
                <td>
                  <div className="inline">
                    <button className="button button-secondary" onClick={() => resolve(row._id, "approve")}>Approve</button>
                    <button className="button button-danger" onClick={() => resolve(row._id, "reject")}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="6">No requests found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPasswordResets;

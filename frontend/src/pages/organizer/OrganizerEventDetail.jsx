import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";
import Forum from "../../components/Forum";

function OrganizerEventDetail() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    paymentStatus: "",
    attendance: "",
    regStatus: "",
  });
  const [editFields, setEditFields] = useState({
    description: "",
    registrationDeadline: "",
    registrationLimit: "",
  });
  const [status, setStatus] = useState("Published");
  const [activeTab, setActiveTab] = useState("Participants");

  // Feedback State
  const [feedbackData, setFeedbackData] = useState({ stats: null, list: [] });
  const [feedbackFilter, setFeedbackFilter] = useState("");

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/events/${eventId}/organizer-detail`, { params: filters });
      setData(response.data?.data);
      setError("");
      const overview = response.data?.data?.overview;
      setEditFields({
        description: overview?.description || "",
        registrationDeadline: overview?.registrationDeadline ? new Date(overview.registrationDeadline).toISOString().slice(0, 16) : "",
        registrationLimit: overview?.registrationLimit || "",
      });
      setStatus(overview?.status || "Published");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event detail"));
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await api.get(`/feedback/event/${eventId}`, {
        params: { rating: feedbackFilter }
      });
      setFeedbackData({
        stats: response.data.data.stats,
        list: response.data.data.feedbackList,
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === "Feedback") {
      fetchFeedback();
    }
  }, [eventId, activeTab, feedbackFilter]);

  const applyFilters = () => {
    fetchDetail();
  };

  const updateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/events/${eventId}`, {
        updates: {
          description: editFields.description,
          registrationDeadline: editFields.registrationDeadline,
          registrationLimit: Number(editFields.registrationLimit),
        },
      });
      alert("Event updated");
      fetchDetail();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update event"));
    }
  };

  const updateStatus = async () => {
    try {
      await api.patch(`/events/${eventId}/status`, { status });
      alert("Status updated");
      fetchDetail();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update status"));
    }
  };

  const exportCsv = async () => {
    try {
      const response = await api.get(`/events/${eventId}/participants/export`, {
        params: filters,
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}-participants.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to export CSV"));
    }
  };

  const handleApprove = async (registrationId) => {
    try {
      if (!window.confirm("Approve this merchandise order?")) return;
      await api.post(`/registrations/approve-merch/${registrationId}`);
      alert("Order approved and ticket generated successfully");
      fetchDetail();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to approve order"));
    }
  };

  const handleReject = async (registrationId) => {
    try {
      if (!window.confirm("Reject this merchandise order?")) return;
      await api.post(`/registrations/reject-merch/${registrationId}`);
      alert("Order rejected.");
      fetchDetail();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to reject order"));
    }
  };

  if (!data) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  const overview = data.overview;

  return (
    <div className="page">
      <h2>Event Detail: {overview.name}</h2>
      {error && <p>{error}</p>}

      <div className="card">
        <h3>Overview</h3>
        <p>Type: {overview.eventType}</p>
        <p>Status: {overview.status}</p>
        <p>Eligibility: {overview.eligibility}</p>
        <p>Pricing: ₹{overview.pricing?.registrationFee || overview.pricing?.price || 0}</p>
        <p>Start: {new Date(overview.eventStartDate).toLocaleString()}</p>
        <p>End: {new Date(overview.eventEndDate).toLocaleString()}</p>
      </div>

      <div className="card">
        <h3>Analytics</h3>
        <p>Registrations: {data.analytics?.registrations || 0}</p>
        <p>Sales: {data.analytics?.sales || 0}</p>
        <p>Revenue: ₹{data.analytics?.revenue || 0}</p>
        <p>Attendance: {data.analytics?.attendance?.attended || 0}</p>
        <p>Team Completion: {data.analytics?.teamCompletion?.completed || 0} / {data.analytics?.teamCompletion?.total || 0}</p>
      </div>

      <form className="card" onSubmit={updateEvent}>
        <h3>Edit Event (Allowed fields)</h3>
        <textarea
          className="input"
          value={editFields.description}
          onChange={(e) => setEditFields((p) => ({ ...p, description: e.target.value }))}
        />
        <input
          className="input"
          type="datetime-local"
          value={editFields.registrationDeadline}
          onChange={(e) => setEditFields((p) => ({ ...p, registrationDeadline: e.target.value }))}
        />
        <input
          className="input"
          type="number"
          value={editFields.registrationLimit}
          onChange={(e) => setEditFields((p) => ({ ...p, registrationLimit: e.target.value }))}
        />
        <button className="button" type="submit">Save Changes</button>
      </form>

      <div className="card">
        <h3>Update Status</h3>
        <div className="inline">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
          </select>
          <button className="button" onClick={updateStatus}>Update Status</button>
        </div>
      </div>

      <div className="card">
        <h3>Dashboard Sections</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button className={`button ${activeTab === 'Participants' ? '' : 'button-secondary'}`} onClick={() => setActiveTab('Participants')}>
            Participants
          </button>
          <button className={`button ${activeTab === 'Discussion' ? '' : 'button-secondary'}`} onClick={() => setActiveTab('Discussion')}>
            Discussion Forum
          </button>
          <button className={`button ${activeTab === 'Feedback' ? '' : 'button-secondary'}`} onClick={() => setActiveTab('Feedback')}>
            Feedback
          </button>
          {overview.eventType === "Merchandise" && (
            <button className={`button ${activeTab === 'Approvals' ? '' : 'button-secondary'}`} onClick={() => setActiveTab('Approvals')}>
              Merchandise Approvals
            </button>
          )}
        </div>

        {activeTab === 'Participants' && (
          <div>
            <div className="grid-4" style={{ marginBottom: "15px" }}>
              <input className="input" placeholder="Search" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
              <select className="input" value={filters.paymentStatus} onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}>
                <option value="">Payment</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="N/A">N/A</option>
              </select>
              <select className="input" value={filters.attendance} onChange={(e) => setFilters((p) => ({ ...p, attendance: e.target.value }))}>
                <option value="">Attendance</option>
                <option value="attended">Attended</option>
                <option value="not_attended">Not Attended</option>
              </select>
              <select className="input" value={filters.regStatus} onChange={(e) => setFilters((p) => ({ ...p, regStatus: e.target.value }))}>
                <option value="">Reg Status</option>
                <option value="Registered">Registered</option>
                <option value="Attended">Attended</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="inline" style={{ marginBottom: "15px" }}>
              <button className="button button-secondary" onClick={applyFilters}>Apply Filters</button>
              <button className="button" onClick={exportCsv}>Export CSV</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Reg Date</th>
                  <th>Payment</th>
                  <th>Team</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {(data.participants?.records || []).map((p) => (
                  <tr key={p.registrationId}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.registrationDate ? new Date(p.registrationDate).toLocaleString() : "-"}</td>
                    <td>{p.paymentStatus}</td>
                    <td>{p.teamName}</td>
                    <td>{p.attendanceStatus}</td>
                  </tr>
                ))}
                {!data.participants?.records?.length && (
                  <tr>
                    <td colSpan="6">No participants found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Approvals' && overview.eventType === "Merchandise" && (
          <div>
            <p className="muted">Review pending merchandise payment proofs below.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Quantity</th>
                  <th>Total Amt</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.participants?.records || [])
                  .filter(p => p.status === "Pending")
                  .map((p) => {
                    const totalAmount = p.quantity * (overview.pricing?.price || overview.pricing?.registrationFee || 0);
                    return (
                      <tr key={p.registrationId}>
                        <td>
                          <div>{p.name}</div>
                          <div style={{ fontSize: "0.8em", color: "#666" }}>{p.email}</div>
                        </td>
                        <td>{p.quantity}</td>
                        <td>₹{totalAmount}</td>
                        <td>
                          {p.paymentProof ? (
                            <a href={p.paymentProof} target="_blank" rel="noreferrer">
                              <img src={p.paymentProof} alt="Proof" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ccc" }} />
                            </a>
                          ) : "No Image"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "5px" }}>
                            <button className="button" style={{ padding: "5px 10px", fontSize: "0.85em" }} onClick={() => handleApprove(p.registrationId)}>Approve</button>
                            <button className="button button-danger" style={{ padding: "5px 10px", fontSize: "0.85em" }} onClick={() => handleReject(p.registrationId)}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {!(data.participants?.records || []).some(p => p.status === "Pending") && (
                  <tr>
                    <td colSpan="5">No pending approvals found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Discussion' && (
          <Forum eventId={eventId} currentUserRole="Organizer" />
        )}

        {activeTab === 'Feedback' && (
          <div>
            {feedbackData.stats && (
              <div style={{ display: "flex", gap: "20px", marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                <div>
                  <h4 style={{ margin: 0, color: "#666" }}>Average Rating</h4>
                  <p style={{ fontSize: "2em", fontWeight: "bold", margin: "5px 0", color: "#333" }}>
                    {feedbackData.stats.averageRating ? feedbackData.stats.averageRating.toFixed(1) : "0.0"} <span style={{ fontSize: "0.5em" }}>/ 5</span>
                  </p>
                </div>
                <div>
                  <h4 style={{ margin: 0, color: "#666" }}>Total Reviews</h4>
                  <p style={{ fontSize: "2em", fontWeight: "bold", margin: "5px 0", color: "#333" }}>{feedbackData.stats.totalReviews}</p>
                </div>
              </div>
            )}

            <div className="inline" style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <strong>Filter Rating:</strong>
                <select className="input" value={feedbackFilter} onChange={(e) => setFeedbackFilter(e.target.value)} style={{ width: "150px" }}>
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <button className="button button-secondary" onClick={() => {
                if (!feedbackData.list.length) return alert("No feedback available to export");
                const headers = ["Date", "Rating", "Comment"];
                const rows = feedbackData.list.map(f => [
                  new Date(f.createdAt).toLocaleString(),
                  f.rating,
                  `"${(f.comment || "").replace(/"/g, '""')}"`
                ]);
                const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                const blob = new Blob([csvContent], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `event-${eventId}-feedback.csv`;
                a.click();
              }}>Export Feedback CSV</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {feedbackData.list.length === 0 ? (
                <p className="muted">No feedback matches your filter.</p>
              ) : (
                feedbackData.list.map(fb => (
                  <div key={fb._id} style={{ padding: "15px", border: "1px solid #eee", borderRadius: "5px", backgroundColor: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ color: "#FFD700", fontSize: "1.2rem", letterSpacing: "2px" }}>
                        {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                      </div>
                      <span className="muted" style={{ fontSize: "0.85em" }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, color: "#444", fontStyle: fb.comment ? "normal" : "italic" }}>
                      {fb.comment || "No comment provided."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizerEventDetail;

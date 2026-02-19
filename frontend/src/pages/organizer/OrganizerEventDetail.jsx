import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

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

  useEffect(() => {
    fetchDetail();
  }, [eventId]);

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
        <h3>Participants</h3>
        <div className="grid-4">
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
        <div className="inline">
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
    </div>
  );
}

export default OrganizerEventDetail;

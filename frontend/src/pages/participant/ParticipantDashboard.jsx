import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "normal", label: "Normal" },
  { key: "merchandise", label: "Merchandise" },
  { key: "completed", label: "Completed" },
  { key: "cancelled-rejected", label: "Cancelled/Rejected" },
];

function ParticipantDashboard() {
  const [tab, setTab] = useState("upcoming");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/registrations/my-registrations", { params: { tab } });
        setRows(response.data?.data || []);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load registrations"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab]);

  return (
    <div className="page">
      <h2>My Events Dashboard</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`button button-secondary ${tab === t.key ? "active-tab" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Type</th>
              <th>Organizer</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id || row.ticketId}>
                <td>{row.eventName}</td>
                <td>{row.eventType}</td>
                <td>{row.organizer}</td>
                <td>{row.participationStatus}</td>
                <td>
                  {row.schedule?.start ? new Date(row.schedule.start).toLocaleString() : "-"}
                </td>
                <td>
                  <Link to={`/participant/ticket/${row.ticketId}`}>{row.ticketId}</Link>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan="6">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ParticipantDashboard;

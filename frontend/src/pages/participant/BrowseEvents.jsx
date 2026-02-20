import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function BrowseEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    eventType: "",
    followedOnly: false,
    trending: false,
    eligibility: "",
    startDate: "",
    endDate: "",
  });

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/events/browse", {
        params: {
          search: filters.search || undefined,
          eventType: filters.eventType || undefined,
          followedOnly: filters.followedOnly || undefined,
          eligibility: filters.eligibility || undefined,
          trending: filters.trending || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
      });
      setEvents(response.data?.data?.events || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const registerEvent = async (event) => {
    try {
      await api.post("/registrations/register", {
        eventId: event._id,
        quantity: event.eventType === "Merchandise" ? 1 : undefined,
      });
      alert("Registered successfully");
    } catch (err) {
      alert(getApiErrorMessage(err, "Registration failed"));
    }
  };

  return (
    <div className="page">
      <h2>Browse Events</h2>

      <div className="card grid-3">
        <input
          className="input"
          placeholder="Search by event/organizer"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />
        <select
          className="input"
          value={filters.eventType}
          onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value }))}
        >
          <option value="">All Types</option>
          <option value="Normal">Normal</option>
          <option value="Merchandise">Merchandise</option>
        </select>
        <select
          className="input"
          value={filters.eligibility}
          onChange={(e) => setFilters((prev) => ({ ...prev, eligibility: e.target.value }))}
        >
          <option value="">All Eligibility</option>
          <option value="IIIT">IIIT Only</option>
          <option value="NON_IIIT">Non-IIIT Only</option>
        </select>

        <input
          className="input"
          type="date"
          placeholder="From Date"
          value={filters.startDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
        />
        <input
          className="input"
          type="date"
          placeholder="To Date"
          value={filters.endDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
          <label className="inline">
            <input
              type="checkbox"
              checked={filters.followedOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, followedOnly: e.target.checked }))}
            />
            Followed clubs only
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={filters.trending}
              onChange={(e) => setFilters((prev) => ({ ...prev, trending: e.target.checked }))}
            />
            Trending (Top 5 / 24h)
          </label>
        </div>
      </div>

      <div className="inline">
        <button className="button" onClick={fetchEvents}>Apply Filters</button>
      </div>

      {error && <p>{error}</p>}
      {loading && <p>Loading...</p>}

      <div className="list">
        {events.map((event) => (
          <div className="card" key={event._id}>
            <h3>{event.name}</h3>
            <p className="muted">{event.organizerId?.organizerName} • {event.eventType}</p>
            <p>{event.description}</p>
            <p>Status: {event.status}</p>
            <p>Deadline: {new Date(event.registrationDeadline).toLocaleString()}</p>
            <div className="inline">
              <Link className="button button-secondary" to={`/participant/events/${event._id}`}>
                Details
              </Link>
              <button
                className="button"
                disabled={!event.availability?.canRegister}
                onClick={() => registerEvent(event)}
              >
                {event.availability?.actionLabel || "Register"}
              </button>
            </div>
            {!event.availability?.canRegister && (
              <p className="muted">{event.availability?.blockedReasons?.join(", ")}</p>
            )}
          </div>
        ))}
        {!events.length && !loading && <p>No events found.</p>}
      </div>
    </div>
  );
}

export default BrowseEvents;

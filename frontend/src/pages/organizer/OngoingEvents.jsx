import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function OngoingEvents() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/events/ongoing");
        setEvents(response.data?.data || []);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load ongoing events"));
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page">
      <h2>Ongoing Events</h2>
      {error && <p>{error}</p>}
      <div className="list">
        {events.map((event) => (
          <div key={event._id} className="card">
            <h3>{event.name}</h3>
            <p>{event.eventType} • {event.status}</p>
            <Link className="button button-secondary" to={`/organizer/events/${event._id}`}>
              View Event
            </Link>
          </div>
        ))}
        {!events.length && <p>No ongoing events found.</p>}
      </div>
    </div>
  );
}

export default OngoingEvents;

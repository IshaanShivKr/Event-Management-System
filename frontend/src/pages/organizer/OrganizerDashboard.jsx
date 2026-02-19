import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function OrganizerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/events/dashboard");
        setData(response.data?.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load dashboard"));
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  return (
    <div className="page">
      <h2>Organizer Dashboard</h2>
      <div className="card">
        <h3>Event Analytics (Completed)</h3>
        <p>Completed Events: {data.aggregateAnalytics?.completedEvents || 0}</p>
        <p>Registrations: {data.aggregateAnalytics?.registrations || 0}</p>
        <p>Sales: {data.aggregateAnalytics?.sales || 0}</p>
        <p>Revenue: ₹{data.aggregateAnalytics?.revenue || 0}</p>
        <p>Attendance: {data.aggregateAnalytics?.attendance || 0}</p>
      </div>

      <div className="card">
        <h3>Events Carousel</h3>
        <div className="list">
          {(data.carouselEvents || []).map((event) => (
            <div key={event._id} className="card card-lite">
              <p><strong>{event.name}</strong></p>
              <p>{event.type} • {event.status}</p>
              <Link className="button button-secondary" to={`/organizer/events/${event._id}`}>Manage</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrganizerDashboard;

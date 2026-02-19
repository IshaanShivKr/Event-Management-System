import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function ParticipantOrganizerDetail() {
  const { organizerId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/users/organizer/${organizerId}`);
        setData(response.data?.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load organizer detail"));
      }
    };
    fetchData();
  }, [organizerId]);

  if (!data) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  return (
    <div className="page">
      <h2>{data.organizer?.organizerName}</h2>
      <div className="card">
        <p>Category: {data.organizer?.category}</p>
        <p>Description: {data.organizer?.description}</p>
        <p>Contact: {data.organizer?.contactEmail}</p>
      </div>
      <div className="card">
        <h3>Upcoming Events</h3>
        <ul>
          {(data.events?.upcoming || []).map((event) => (
            <li key={event._id}>{event.name} ({event.eventType})</li>
          ))}
          {!data.events?.upcoming?.length && <li>No upcoming events</li>}
        </ul>
      </div>
      <div className="card">
        <h3>Past Events</h3>
        <ul>
          {(data.events?.past || []).map((event) => (
            <li key={event._id}>{event.name} ({event.eventType})</li>
          ))}
          {!data.events?.past?.length && <li>No past events</li>}
        </ul>
      </div>
    </div>
  );
}

export default ParticipantOrganizerDetail;

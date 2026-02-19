import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function ParticipantEventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data?.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event"));
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const register = async () => {
    try {
      await api.post("/registrations/register", {
        eventId,
        quantity: event?.eventType === "Merchandise" ? Number(quantity) || 1 : undefined,
      });
      alert("Registration successful");
      fetchEvent();
    } catch (err) {
      alert(getApiErrorMessage(err, "Registration failed"));
    }
  };

  if (!event) {
    return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;
  }

  return (
    <div className="page">
      <h2>{event.name}</h2>
      <div className="card">
        <p>{event.description}</p>
        <p>Type: {event.eventType}</p>
        <p>Organizer: {event.organizerId?.organizerName}</p>
        <p>Status: {event.status}</p>
        <p>Eligibility: {event.eligibility}</p>
        <p>Start: {new Date(event.eventStartDate).toLocaleString()}</p>
        <p>End: {new Date(event.eventEndDate).toLocaleString()}</p>
        <p>Deadline: {new Date(event.registrationDeadline).toLocaleString()}</p>

        {event.eventType === "Merchandise" && (
          <div className="inline">
            <label>Quantity:</label>
            <input
              className="input small"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        )}

        <button className="button" onClick={register} disabled={!event.availability?.canRegister}>
          {event.availability?.actionLabel || "Register"}
        </button>
        {!event.availability?.canRegister && (
          <p className="muted">{event.availability?.blockedReasons?.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

export default ParticipantEventDetail;

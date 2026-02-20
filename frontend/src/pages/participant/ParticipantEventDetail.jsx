import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function ParticipantEventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [formResponses, setFormResponses] = useState({});
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

  const handleResponseChange = (fieldId, value) => {
    setFormResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const register = async () => {
    try {
      const payload = { eventId };
      if (event?.eventType === "Normal") {
        payload.responses = Object.entries(formResponses).map(([fieldId, value]) => ({
          fieldId,
          value: Array.isArray(value) ? value.join(", ") : value
        }));
      } else if (event?.eventType === "Merchandise") {
        payload.quantity = Number(quantity) || 1;
      }

      await api.post("/registrations/register", payload);
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
        {(event.registrationFee > 0 || event.price > 0) && (
          <p><strong>Price: ₹{event.registrationFee || event.price}</strong></p>
        )}

        {event.eventType === "Normal" && event.customFormFields?.length > 0 && (
          <div style={{ marginTop: "20px", marginBottom: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <h4>Registration Form</h4>
            {event.customFormFields.map(field => (
              <div key={field._id} style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                </label>

                {field.fieldType === "text" && (
                  <input className="input" type="text"
                    onChange={e => handleResponseChange(field._id, e.target.value)}
                    required={field.required}
                  />
                )}

                {field.fieldType === "dropdown" && (
                  <select className="input" onChange={e => handleResponseChange(field._id, e.target.value)} required={field.required}>
                    <option value="">Select...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}

                {field.fieldType === "checkbox" && (
                  <div>
                    {field.options?.map(opt => (
                      <label key={opt} style={{ display: "block", marginBottom: "5px" }}>
                        <input type="checkbox"
                          onChange={(e) => {
                            const current = formResponses[field._id] || [];
                            const updated = e.target.checked
                              ? [...current, opt]
                              : current.filter(val => val !== opt);
                            handleResponseChange(field._id, updated);
                          }}
                        /> {opt}
                      </label>
                    ))}
                  </div>
                )}

                {field.fieldType === "file" && (
                  <input className="input" type="file" onChange={e => handleResponseChange(field._id, e.target.value)} required={field.required} />
                )}
              </div>
            ))}
          </div>
        )}

        {event.eventType === "Merchandise" && (
          <div className="inline" style={{ marginTop: "15px", marginBottom: "15px" }}>
            <label>Quantity:</label>
            <input
              className="input small"
              type="number"
              min="1"
              max={event.purchaseLimit || 1}
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

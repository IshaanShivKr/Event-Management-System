import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";
import Forum from "../../components/Forum";

function ParticipantEventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [formResponses, setFormResponses] = useState({});
  const [error, setError] = useState("");

  const [teamAction, setTeamAction] = useState(null); // 'create' or 'join'
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [activeTab, setActiveTab] = useState("Details");
  const [myRegistration, setMyRegistration] = useState(null);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data?.data);

      // Attempt to load my registration to see if I can leave feedback
      try {
        const regRes = await api.get('/registrations/my-registrations');
        const regs = regRes.data?.data || [];
        const thisEventReg = regs.find(r => String(r.eventId?._id || r.eventId) === String(eventId));
        if (thisEventReg) setMyRegistration(thisEventReg);
      } catch (e) {
        // Ignore, might not be logged in or participant
      }
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size exceeds 5MB limit");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const isTeamEvent = event?.maxTeamSize > 1;

  const handleCreateTeam = async () => {
    if (!teamName) return alert("Team name is required");
    try {
      await api.post("/teams/create", { eventId, name: teamName });
      alert("Team created successfully! Check your Teams Dashboard.");
      setTeamAction(null);
      fetchEvent();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to create team"));
    }
  };

  const handleJoinTeam = async () => {
    if (!inviteCode) return alert("Invite code is required");
    try {
      await api.post("/teams/join", { inviteCode });
      alert("Joined team successfully!");
      setTeamAction(null);
      fetchEvent();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to join team"));
    }
  };

  const register = async () => {
    if (isTeamEvent) {
      return alert("Please create or join a team for this event.");
    }

    try {
      const payload = { eventId };
      if (event?.eventType === "Normal") {
        payload.responses = Object.entries(formResponses).map(([fieldId, value]) => ({
          fieldId,
          value: Array.isArray(value) ? value.join(", ") : value
        }));
      } else if (event?.eventType === "Merchandise") {
        if (!paymentProof) return alert("Payment proof is required for merchandise orders.");
        payload.quantity = Number(quantity) || 1;
        payload.paymentProof = paymentProof;
      }

      const res = await api.post("/registrations/register", payload);
      alert(res.data?.message || "Registration successful");
      fetchEvent();
    } catch (err) {
      alert(getApiErrorMessage(err, "Registration failed"));
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setFeedbackLoading(true);
    try {
      await api.post(`/feedback/${eventId}`, { rating: Number(feedbackRating), comment: feedbackComment });
      alert("Thank you for your anonymous feedback!");
      setMyRegistration(prev => ({ ...prev, feedbackSubmitted: true }));
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to submit feedback"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (!event) {
    return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{event.name}</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={`button ${activeTab === 'Details' ? '' : 'button-secondary'}`}
            onClick={() => setActiveTab('Details')}
          >
            Event Details
          </button>
          {(event.availability?.canRegister || event.status === "Ongoing") && (
            <button
              className={`button ${activeTab === 'Discussion' ? '' : 'button-secondary'}`}
              onClick={() => setActiveTab('Discussion')}
            >
              Discussion Forum
            </button>
          )}
        </div>
      </div>

      {activeTab === 'Details' ? (
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
            <div className="card" style={{ marginTop: "15px", marginBottom: "15px" }}>
              <h4>Order Details</h4>
              <div className="inline" style={{ marginBottom: "15px" }}>
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

              <div style={{ padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd" }}>
                <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Payment Instructions</p>
                <p style={{ fontSize: "0.9em", color: "#555" }}>Please transfer <strong>₹{(event.price || 0) * quantity}</strong> to the organizer's account and upload the screenshot as proof. Your order will be pending until approved.</p>
                <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>Upload Payment Proof *</label>
                <input type="file" className="input" accept="image/*" onChange={handleFileChange} required />
                {paymentProof && <img src={paymentProof} alt="Proof preview" style={{ marginTop: "10px", maxWidth: "200px", borderRadius: "5px" }} />}
              </div>
            </div>
          )}

          {isTeamEvent && (
            <div className="card" style={{ marginTop: "15px", marginBottom: "15px", backgroundColor: "#333", color: "white" }}>
              <h4>Team Event (Max Size: {event.maxTeamSize})</h4>
              <p style={{ fontSize: "0.9em", color: "#ccc" }}>This event requires you to form or join a team. The team leader is responsible for filling the registration form for the group.</p>
              {teamAction === null && (
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button className="button" onClick={() => setTeamAction("create")}>Create Team</button>
                  <button className="button button-secondary" onClick={() => setTeamAction("join")}>Join Team</button>
                </div>
              )}
              {teamAction === "create" && (
                <div style={{ marginTop: "10px" }}>
                  <input className="input" placeholder="Enter new team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button className="button" onClick={handleCreateTeam}>Confirm Create</button>
                    <button className="button button-danger" onClick={() => setTeamAction(null)}>Cancel</button>
                  </div>
                </div>
              )}
              {teamAction === "join" && (
                <div style={{ marginTop: "10px" }}>
                  <input className="input" placeholder="Enter invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button className="button" onClick={handleJoinTeam}>Confirm Join</button>
                    <button className="button button-danger" onClick={() => setTeamAction(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isTeamEvent && (
            <button className="button" onClick={register} disabled={!event.availability?.canRegister}>
              {event.availability?.actionLabel || "Register"}
            </button>
          )}
          {!isTeamEvent && !event.availability?.canRegister && (
            <p className="muted">{event.availability?.blockedReasons?.join(", ")}</p>
          )}

          {/* Feedback Section */}
          {myRegistration?.status === "Attended" && (
            <div className="card" style={{ marginTop: "20px", border: "1px solid #4CAF50" }}>
              <h4 style={{ color: "#4CAF50", marginTop: 0 }}>Event Feedback</h4>
              {myRegistration.feedbackSubmitted ? (
                <p style={{ color: "#555" }}>Thank you! Your anonymous feedback has been recorded.</p>
              ) : (
                <form onSubmit={submitFeedback}>
                  <p style={{ fontSize: "0.9em", color: "#666", marginBottom: "15px" }}>
                    Please share your experience. Your feedback is entirely anonymous and not linked to your registration.
                  </p>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Rating (1-5 Stars)</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          style={{
                            background: "none", border: "none",
                            fontSize: "1.5rem", cursor: "pointer",
                            color: star <= feedbackRating ? "#FFD700" : "#ccc"
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Comments (Optional)</label>
                    <textarea
                      className="input"
                      rows="3"
                      placeholder="What did you like or dislike?"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="button" disabled={feedbackLoading} style={{ backgroundColor: "#4CAF50" }}>
                    {feedbackLoading ? "Submitting..." : "Submit Anonymous Feedback"}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      ) : (
        <Forum eventId={eventId} currentUserRole="Participant" />
      )}
    </div>
  );
}

export default ParticipantEventDetail;

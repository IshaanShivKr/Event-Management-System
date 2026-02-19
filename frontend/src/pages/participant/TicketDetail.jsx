import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function TicketDetail() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await api.get(`/registrations/ticket/${ticketId}`);
        setTicket(response.data?.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load ticket"));
      }
    };
    fetchTicket();
  }, [ticketId]);

  if (!ticket) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  return (
    <div className="page">
      <h2>Ticket {ticket.ticketId}</h2>
      <div className="card">
        <p>Event: {ticket.eventName}</p>
        <p>Type: {ticket.eventType}</p>
        <p>Organizer: {ticket.organizer}</p>
        <p>Status: {ticket.participationStatus}</p>
        {ticket.qrCodeDataUrl && (
          <img src={ticket.qrCodeDataUrl} alt="Ticket QR" className="qr" />
        )}
      </div>
    </div>
  );
}

export default TicketDetail;

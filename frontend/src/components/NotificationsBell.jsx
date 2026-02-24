import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function NotificationsBell({ role }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Only fetch for roles that care about forum notifications (Participant)
        // Though organizers can get them too theoretically, the requirement focuses on registered participants
        fetchNotifications();

        // We could poll here, or rely on socket.io in a global context. 
        // Given scope, simple 30s poll or refresh on navigation is fine for the bell itself 
        // since real-time sockets are on the event page.
        const interval = setInterval(fetchNotifications, 30000);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const resp = await api.get("/forum/notifications");
            setNotifications(resp.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch notifications");
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notif) => {
        try {
            if (!notif.isRead) {
                await api.patch(`/forum/notifications/${notif._id}/read`);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
            }
            setIsOpen(false);
            // Navigate to the event's forum
            const basePath = role === "Organizer" ? "/organizer/events" : "/participant/events";
            navigate(`${basePath}/${notif.eventId?._id || notif.eventId}`);
        } catch (err) {
            console.error("Failed to mark read");
        }
    };

    return (
        <div style={{ position: "relative", display: "inline-block", marginRight: "15px" }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{ background: "none", border: "none", fontSize: "1.5em", cursor: "pointer", position: "relative", outline: "none" }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute", top: "-5px", right: "-5px", background: "red", color: "white",
                        borderRadius: "50%", padding: "2px 6px", fontSize: "0.5em", fontWeight: "bold"
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute", top: "40px", right: "0", width: "300px", background: "white",
                    border: "1px solid #ccc", borderRadius: "5px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", zIndex: 1000,
                    maxHeight: "400px", overflowY: "auto"
                }}>
                    <h4 style={{ margin: 0, padding: "10px", borderBottom: "1px solid #eee", background: "#f9f9f9" }}>Notifications</h4>
                    {notifications.length === 0 ? (
                        <p style={{ padding: "15px", margin: 0, textAlign: "center", color: "#888", fontSize: "0.9em" }}>No notifications.</p>
                    ) : (
                        notifications.map(notif => (
                            <div
                                key={notif._id}
                                onClick={() => handleNotificationClick(notif)}
                                style={{
                                    padding: "10px", borderBottom: "1px solid #eee", cursor: "pointer",
                                    backgroundColor: notif.isRead ? "white" : "#e6f2ff",
                                    transition: "background 0.2s"
                                }}
                            >
                                <p style={{ margin: "0 0 5px 0", fontSize: "0.9em", fontWeight: notif.isRead ? "normal" : "bold" }}>
                                    {notif.message}
                                </p>
                                <span style={{ fontSize: "0.75em", color: "#888" }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationsBell;

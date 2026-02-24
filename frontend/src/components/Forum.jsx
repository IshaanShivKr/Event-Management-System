import { useEffect, useState, useRef } from "react";
import api, { getApiErrorMessage } from "../services/api";
import { io } from "socket.io-client";

// In a real app, you'd want this in an env var. We use window.location for simplicity to point to backend.
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

function Forum({ eventId, currentUserRole }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // Message object being replied to
    const [error, setError] = useState("");
    const socketRef = useRef();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();

        // Setup Socket.io
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on("connect", () => {
            socketRef.current.emit("join_event_room", eventId);
        });

        socketRef.current.on("new_message", (msg) => {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        });

        socketRef.current.on("message_deleted", (deletedMsgId) => {
            setMessages(prev => prev.filter(m => m._id !== deletedMsgId && (!m.replyTo || m.replyTo._id !== deletedMsgId)));
        });

        socketRef.current.on("message_pinned", (updatedMsg) => {
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? { ...m, isPinned: updatedMsg.isPinned } : m));
        });

        socketRef.current.on("reaction_updated", (updatedMsg) => {
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? { ...m, reactions: updatedMsg.reactions } : m));
        });

        return () => {
            socketRef.current.emit("leave_event_room", eventId);
            socketRef.current.disconnect();
        };
    }, [eventId]);

    const fetchMessages = async () => {
        try {
            const resp = await api.get(`/forum/${eventId}`);
            setMessages(resp.data?.data || []);
            scrollToBottom();
        } catch (err) {
            setError("Failed to load forum messages");
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.post(`/forum/${eventId}`, {
                content: newMessage,
                isAnnouncement,
                replyTo: replyTo?._id || null
            });
            setNewMessage("");
            setReplyTo(null);
            setIsAnnouncement(false);
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to post"));
        }
    };

    const handleDelete = async (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            await api.delete(`/forum/${msgId}`);
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to delete"));
        }
    };

    const handleTogglePin = async (msgId) => {
        try {
            await api.patch(`/forum/${msgId}/pin`);
        } catch (err) {
            alert(getApiErrorMessage(err, "Failed to pin"));
        }
    };

    const handleReact = async (msgId, emoji) => {
        try {
            await api.patch(`/forum/${msgId}/react`, { emoji });
        } catch (err) {
            console.error("Failed to react", err);
        }
    };

    // Group messages to show threads neatly
    const topLevelMessages = messages.filter(m => !m.replyTo);
    const replies = messages.filter(m => m.replyTo);

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h3>Live Discussion</h3>
            {error && <p className="error">{error}</p>}

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
                {topLevelMessages.map(msg => (
                    <MessageItem
                        key={msg._id}
                        msg={msg}
                        allReplies={replies.filter(r => r.replyTo?._id === msg._id)}
                        currentUserRole={currentUserRole}
                        onDelete={handleDelete}
                        onPin={handleTogglePin}
                        onReact={handleReact}
                        onReply={() => setReplyTo(msg)}
                    />
                ))}
                {topLevelMessages.length === 0 && <p className="muted" style={{ textAlign: "center", marginTop: "20px" }}>No messages yet. Start the conversation!</p>}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ marginTop: '15px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                {replyTo && (
                    <div style={{ backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8em' }}>Replying to <strong>{replyTo.senderName}</strong>: "{replyTo.content.substring(0, 20)}..."</span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setReplyTo(null)}>X</button>
                    </div>
                )}
                <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                        className="input"
                        rows="2"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        required
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {currentUserRole === 'Organizer' ? (
                            <label className="muted" style={{ fontSize: '0.85em' }}>
                                <input type="checkbox" checked={isAnnouncement} onChange={e => setIsAnnouncement(e.target.checked)} /> Mark as Announcement (Notifies all)
                            </label>
                        ) : <div></div>}
                        <button type="submit" className="button">Send</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MessageItem({ msg, allReplies, currentUserRole, onDelete, onPin, onReact, onReply }) {
    const isOwner = localStorage.getItem('user_id'); // We'd need actual user ID to verify exactly owner vs organizer, 
    // but the backend enforces this. We can just show 'Delete' if Organizer.

    return (
        <div style={{ marginBottom: "15px", padding: '10px', backgroundColor: msg.isAnnouncement ? '#ffebcc' : '#fff', borderLeft: msg.isPinned ? '4px solid #ff9800' : '1px solid #ddd', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: '5px' }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: '8px' }}>
                    <strong style={{ color: msg.senderRole === "Organizer" ? "#e65100" : "#333" }}>{msg.senderName}</strong>
                    {msg.senderRole === "Organizer" && <span style={{ fontSize: '0.7em', padding: '2px 4px', backgroundColor: '#ffe0b2', color: '#e65100', borderRadius: '3px' }}>Organizer</span>}
                    <span style={{ fontSize: '0.8em', color: '#888' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {msg.isPinned && <span style={{ fontSize: '0.8em', color: '#ff9800', fontWeight: 'bold' }}>📌 Pinned</span>}
                </div>
            </div>

            <p style={{ margin: "5px 0", whiteSpace: "pre-wrap" }}>{msg.content}</p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                <button style={{ border: 'none', background: 'none', color: '#0066cc', cursor: 'pointer', fontSize: '0.8em', padding: 0 }} onClick={onReply}>Reply</button>

                <div style={{ display: 'flex', gap: '5px' }}>
                    {['👍', '❤️', '😂', '❓'].map(emoji => {
                        const count = msg.reactions?.find(r => r.emoji === emoji)?.users.length || 0;
                        return (
                            <button key={emoji} onClick={() => onReact(msg._id, emoji)} style={{ outline: 'none', border: '1px solid #eee', background: count > 0 ? '#f0f0f0' : 'none', borderRadius: '12px', padding: '2px 6px', fontSize: '0.8em', cursor: 'pointer' }}>
                                {emoji} {count > 0 && count}
                            </button>
                        );
                    })}
                </div>

                {currentUserRole === "Organizer" && (
                    <>
                        <button style={{ border: 'none', background: 'none', color: '#ff9800', cursor: 'pointer', fontSize: '0.8em', padding: 0 }} onClick={() => onPin(msg._id)}>
                            {msg.isPinned ? "Unpin" : "Pin"}
                        </button>
                        <button style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer', fontSize: '0.8em', padding: 0 }} onClick={() => onDelete(msg._id)}>Delete</button>
                    </>
                )}
            </div>

            {/* Render Replies */}
            {allReplies && allReplies.length > 0 && (
                <div style={{ marginTop: '10px', paddingLeft: '20px', borderLeft: '2px solid #eee' }}>
                    {allReplies.map(reply => (
                        <div key={reply._id} style={{ marginTop: "10px" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: '8px' }}>
                                <strong style={{ fontSize: '0.9em', color: reply.senderRole === "Organizer" ? "#e65100" : "#333" }}>{reply.senderName}</strong>
                                <span style={{ fontSize: '0.7em', color: '#888' }}>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p style={{ margin: "2px 0", fontSize: '0.9em' }}>{reply.content}</p>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {['👍', '❤️'].map(emoji => {
                                        const rCount = reply.reactions?.find(r => r.emoji === emoji)?.users.length || 0;
                                        return (
                                            <button key={emoji} onClick={() => onReact(reply._id, emoji)} style={{ outline: 'none', border: '1px solid #eee', background: rCount > 0 ? '#f0f0f0' : 'none', borderRadius: '12px', padding: '2px 6px', fontSize: '0.75em', cursor: 'pointer' }}>
                                                {emoji} {rCount > 0 && rCount}
                                            </button>
                                        );
                                    })}
                                </div>
                                {currentUserRole === "Organizer" && (
                                    <button style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer', fontSize: '0.75em', padding: 0 }} onClick={() => onDelete(reply._id)}>Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Forum;

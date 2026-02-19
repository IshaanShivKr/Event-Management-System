import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../services/api";

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/admin/dashboard");
        setData(response.data?.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load admin dashboard"));
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="page">{error ? <p>{error}</p> : <p>Loading...</p>}</div>;

  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      <div className="grid-3">
        <div className="card"><h3>Participants</h3><p>{data.participants}</p></div>
        <div className="card"><h3>Events</h3><p>{data.events}</p></div>
        <div className="card"><h3>Pending Reset Requests</h3><p>{data.pendingResetRequests}</p></div>
      </div>
      <div className="card">
        <h3>Organizers</h3>
        <p>Total: {data.organizers?.total || 0}</p>
        <p>Active: {data.organizers?.active || 0}</p>
        <p>Disabled: {data.organizers?.disabled || 0}</p>
        <p>Archived: {data.organizers?.archived || 0}</p>
      </div>
    </div>
  );
}

export default AdminDashboard;

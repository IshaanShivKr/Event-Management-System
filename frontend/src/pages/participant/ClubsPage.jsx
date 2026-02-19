import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "../../services/api";

function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState("");

  const fetchClubs = async () => {
    try {
      const response = await api.get("/users/organizer");
      setClubs(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load organizers"));
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const toggleFollow = async (club) => {
    try {
      if (club.isFollowed) {
        await api.post(`/users/unfollow/${club._id}`);
      } else {
        await api.post(`/users/follow/${club._id}`);
      }
      fetchClubs();
    } catch (err) {
      alert(getApiErrorMessage(err, "Action failed"));
    }
  };

  return (
    <div className="page">
      <h2>Clubs / Organizers</h2>
      {error && <p>{error}</p>}
      <div className="list">
        {clubs.map((club) => (
          <div className="card" key={club._id}>
            <h3>{club.organizerName}</h3>
            <p className="muted">{club.category}</p>
            <p>{club.description}</p>
            <div className="inline">
              <Link className="button button-secondary" to={`/participant/organizers/${club._id}`}>View</Link>
              <button className="button" onClick={() => toggleFollow(club)}>
                {club.isFollowed ? "Unfollow" : "Follow"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClubsPage;

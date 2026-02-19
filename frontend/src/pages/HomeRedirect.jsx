import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function HomeRedirect() {
  const { hydrated, isAuthenticated, role } = useContext(AuthContext);

  if (!hydrated) return <div className="page"><p>Loading...</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === "Participant") return <Navigate to="/participant/dashboard" replace />;
  if (role === "Organizer") return <Navigate to="/organizer/dashboard" replace />;
  if (role === "Admin") return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

export default HomeRedirect;

import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import HomeRedirect from "./pages/HomeRedirect";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleLayout from "./components/RoleLayout";
import ParticipantDashboard from "./pages/participant/ParticipantDashboard";
import BrowseEvents from "./pages/participant/BrowseEvents";
import ParticipantEventDetail from "./pages/participant/ParticipantEventDetail";
import ClubsPage from "./pages/participant/ClubsPage";
import ParticipantOrganizerDetail from "./pages/participant/ParticipantOrganizerDetail";
import ParticipantProfile from "./pages/participant/ParticipantProfile";
import TicketDetail from "./pages/participant/TicketDetail";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import CreateEvent from "./pages/organizer/CreateEvent";
import OngoingEvents from "./pages/organizer/OngoingEvents";
import OrganizerEventDetail from "./pages/organizer/OrganizerEventDetail";
import OrganizerProfile from "./pages/organizer/OrganizerProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizers from "./pages/admin/AdminOrganizers";
import AdminPasswordResets from "./pages/admin/AdminPasswordResets";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={["Participant"]} />}>
        <Route
          path="/participant"
          element={(
            <RoleLayout
              title="Participant Panel"
              navItems={[
                { to: "/participant/dashboard", label: "Dashboard" },
                { to: "/participant/browse", label: "Browse Events" },
                { to: "/participant/clubs", label: "Clubs/Organizers" },
                { to: "/participant/profile", label: "Profile" },
              ]}
            />
          )}
        >
          <Route index element={<Navigate to="/participant/dashboard" replace />} />
          <Route path="dashboard" element={<ParticipantDashboard />} />
          <Route path="browse" element={<BrowseEvents />} />
          <Route path="events/:eventId" element={<ParticipantEventDetail />} />
          <Route path="clubs" element={<ClubsPage />} />
          <Route path="organizers/:organizerId" element={<ParticipantOrganizerDetail />} />
          <Route path="profile" element={<ParticipantProfile />} />
          <Route path="ticket/:ticketId" element={<TicketDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Organizer"]} />}>
        <Route
          path="/organizer"
          element={(
            <RoleLayout
              title="Organizer Panel"
              navItems={[
                { to: "/organizer/dashboard", label: "Dashboard" },
                { to: "/organizer/create-event", label: "Create Event" },
                { to: "/organizer/ongoing", label: "Ongoing Events" },
                { to: "/organizer/profile", label: "Profile" },
              ]}
            />
          )}
        >
          <Route index element={<Navigate to="/organizer/dashboard" replace />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="create-event" element={<CreateEvent />} />
          <Route path="ongoing" element={<OngoingEvents />} />
          <Route path="events/:eventId" element={<OrganizerEventDetail />} />
          <Route path="profile" element={<OrganizerProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
        <Route
          path="/admin"
          element={(
            <RoleLayout
              title="Admin Panel"
              navItems={[
                { to: "/admin/dashboard", label: "Dashboard" },
                { to: "/admin/organizers", label: "Manage Clubs/Organizers" },
                { to: "/admin/password-resets", label: "Password Reset Requests" },
              ]}
            />
          )}
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="organizers" element={<AdminOrganizers />} />
          <Route path="password-resets" element={<AdminPasswordResets />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

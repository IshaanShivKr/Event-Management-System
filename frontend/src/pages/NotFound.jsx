import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="page">
      <h2>Page Not Found</h2>
      <Link className="button" to="/">Go Home</Link>
    </div>
  );
}

export default NotFound;

import { Navigate, useLocation } from 'react-router-dom';

/**
 * Wraps any route that requires authentication.
 * If no JWT token is found in localStorage, redirects to /login
 * and remembers where the user was trying to go (via `state.from`).
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

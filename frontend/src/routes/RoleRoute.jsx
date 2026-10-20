import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ children, roles = [] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user.role)) {
    // Redirect to role-appropriate dashboard
    const map = {
      superadmin: '/superadmin',
      centeradmin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };
    return <Navigate to={map[user.role] || '/'} replace />;
  }

  return children;
}

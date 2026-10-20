import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [centerSlug, setCenterSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password, centerSlug || undefined);
      toast.success('Logged in successfully');
      const role = data.user.role;
      const redirect =
        role === 'superadmin' ? '/superadmin' :
        role === 'centeradmin' ? '/admin' :
        role === 'teacher' ? '/teacher' : '/student';
      navigate(location.state?.from?.pathname || redirect, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Center Slug (optional)</label>
            <input
              className="input"
              placeholder="demo-coaching"
              value={centerSlug}
              onChange={(e) => setCenterSlug(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          New coaching center?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Register
          </Link>
        </p>
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-500">
          <p className="font-medium mb-1">Demo accounts:</p>
          <p>admin@democoaching.com / Admin@123</p>
          <p>teacher@democoaching.com / Teacher@123</p>
          <p>student1@democoaching.com / Student@123</p>
        </div>
      </div>
    </div>
  );
}

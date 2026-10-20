import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    centerName: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    referralCode: '',
  });
  const [loading, setLoading] = useState(false);
  const { registerCenter } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerCenter(form);
      toast.success('Center registered! Welcome aboard.');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="card w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Create your coaching center</h1>
        <p className="text-center text-sm text-gray-500 mb-6">14-day free trial · No credit card required</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Center Name</label>
            <input name="centerName" className="input" required value={form.centerName} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input name="name" className="input" required value={form.name} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" className="input" required value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" name="password" className="input" required minLength={6} value={form.password} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone (optional)</label>
            <input name="phone" className="input" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Referral Code (optional)</label>
            <input name="referralCode" className="input" value={form.referralCode} onChange={handleChange} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Center'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

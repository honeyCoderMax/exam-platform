import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = {
    centeradmin: [
      { to: '/admin', label: 'Dashboard' },
      { to: '/teacher/questions', label: 'Questions' },
      { to: '/teacher/exams', label: 'Exams' },
    ],
    teacher: [
      { to: '/teacher', label: 'Dashboard' },
      { to: '/teacher/questions', label: 'Question Bank' },
      { to: '/teacher/exams', label: 'Exams' },
    ],
    student: [
      { to: '/student', label: 'Dashboard' },
    ],
  };

  const links = navLinks[user?.role] || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-primary-600">
                ExamPlatform
              </Link>
              <nav className="hidden md:flex gap-4">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
                {user?.name}
              </span>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Logout">
                <LogOut size={18} />
              </button>
              <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}

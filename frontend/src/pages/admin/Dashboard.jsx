import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/analytics/center/dashboard')
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Center Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Students', value: stats?.studentCount ?? '—' },
          { label: 'Teachers', value: stats?.teacherCount ?? '—' },
          { label: 'Exams', value: stats?.examCount ?? '—' },
          { label: 'Attempts', value: stats?.attemptCount ?? '—' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-3xl font-bold text-primary-600">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/teacher/questions" className="card hover:border-primary-300">
          <h3 className="font-semibold">Manage Question Bank</h3>
        </Link>
        <Link to="/teacher/exams" className="card hover:border-primary-300">
          <h3 className="font-semibold">Manage Exams</h3>
        </Link>
      </div>

      {stats?.recentResults?.length > 0 && (
        <div className="card mt-8">
          <h2 className="font-semibold mb-4">Recent Results</h2>
          <div className="space-y-2">
            {stats.recentResults.map((r, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span>{r.student} · {r.exam}</span>
                <span className="font-medium">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

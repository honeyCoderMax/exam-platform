import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exams')
      .then(({ data }) => setExams(data.data.exams || []))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Exams</h1>
      {exams.length === 0 ? (
        <div className="card text-center text-gray-500">No exams assigned yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => (
            <div key={exam._id} className="card flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg">{exam.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                    {exam.settings?.durationMinutes} min
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {exam.settings?.totalMarks} marks
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
                    {exam.status}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                {(exam.status === 'live' || exam.status === 'scheduled') && (
                  <Link to={`/student/exam/${exam._id}`} className="btn-primary w-full text-center">
                    Start / Resume Exam
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

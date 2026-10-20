import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ExamBuilder() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exams')
      .then(({ data }) => setExams(data.data.exams || []))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Exams</h1>
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center text-gray-500">No exams yet. Use the API or seed data.</div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam._id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{exam.title}</h3>
                <p className="text-sm text-gray-500">
                  {exam.settings?.durationMinutes} min · {exam.settings?.totalMarks} marks ·{' '}
                  <span className="capitalize">{exam.status}</span>
                  {exam.isPublished && ' · Published'}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {exam.questions?.length || 0} questions
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

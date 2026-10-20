import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: '', difficulty: '', q: '' });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.subject) params.set('subject', filter.subject);
    if (filter.difficulty) params.set('difficulty', filter.difficulty);
    if (filter.q) params.set('q', filter.q);
    api.get(`/questions?${params}`)
      .then(({ data }) => setQuestions(data.data.questions || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <div className="flex gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search..."
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select
            className="input max-w-[140px]"
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          >
            <option value="">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="btn-primary" onClick={load}>Filter</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : questions.length === 0 ? (
        <div className="card text-center text-gray-500">No questions found. Seed the database or create some.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className="card">
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 rounded">{q.subject}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">{q.difficulty}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{q.type}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{q.marks} marks</span>
              </div>
              <p className="text-sm line-clamp-2">{q.questionText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

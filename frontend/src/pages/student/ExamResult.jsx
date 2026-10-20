import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExamResult() {
  const { resultId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/results/${resultId}`)
      .then(({ data }) => setResult(data.data.result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resultId]);

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />;
  if (!result) return <div className="card">Result not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card text-center">
        <h1 className="text-2xl font-bold mb-2">{result.examId?.title || 'Exam Result'}</h1>
        <div className="text-5xl font-extrabold text-primary-600 my-4">
          {result.percentage}%
        </div>
        <p className="text-lg">
          Score: <strong>{result.score}</strong> / {result.maxScore}
        </p>
        {result.rank && (
          <p className="text-sm text-gray-500 mt-2">
            Rank #{result.rank} · Percentile {result.percentile}
          </p>
        )}
      </div>

      {result.subjectWise?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Subject-wise Performance</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={result.subjectWise}>
              <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#4f46e5" name="Accuracy %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-center">
        <Link to="/student" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  );
}

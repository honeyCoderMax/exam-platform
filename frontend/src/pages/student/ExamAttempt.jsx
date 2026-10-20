import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ExamAttempt() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const violationCount = useRef(0);
  const timerRef = useRef(null);

  // Anti-cheat: tab switch
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && attemptId) {
        api.post(`/attempts/${attemptId}/violation`, { type: 'tab_switch' })
          .then(({ data }) => {
            violationCount.current = data.data.violationCount;
            if (data.data.terminated) {
              toast.error('Attempt terminated due to violations');
              navigate('/student');
            } else {
              toast.error(`Tab switch detected (${data.data.violationCount}/5)`);
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [attemptId, navigate]);

  // Disable right-click & copy
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
    };
  }, []);

  // Start / resume attempt
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post(`/attempts/start/${examId}`);
        const d = data.data;
        setAttemptId(d.attemptId);
        setTimeLeft(d.timeRemainingSeconds);
        setCurrentIdx(d.currentQuestionIndex || 0);

        // Build answers map
        const map = {};
        (d.answers || []).forEach((a) => {
          map[a.questionId] = a;
        });
        setAnswers(map);

        // Fetch full attempt with questions
        const res = await api.get(`/attempts/${d.attemptId}`);
        setQuestions(res.data.data.questions || []);
        setTimeLeft(res.data.data.attempt.timeRemainingSeconds);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Cannot start exam');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [examId, navigate]);

  // Server-synced countdown
  useEffect(() => {
    if (timeLeft <= 0 || !attemptId) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]); // eslint-disable-line

  const saveAnswer = useCallback(
    async (questionId, payload) => {
      if (!attemptId) return;
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...payload, questionId } }));
      try {
        await api.patch(`/attempts/${attemptId}/answer`, {
          questionId,
          ...payload,
          currentQuestionIndex: currentIdx,
        });
      } catch {
        // silent – will retry on next change
      }
    },
    [attemptId, currentIdx]
  );

  const handleSubmit = async (auto = false) => {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/attempts/${attemptId}/submit`);
      toast.success(auto ? 'Time up – auto submitted' : 'Submitted successfully');
      navigate(`/student/result/${data.data.resultId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
      setSubmitting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const q = questions[currentIdx];
  if (!q) return <div className="card">No questions</div>;

  const currentAnswer = answers[q._id] || {};

  return (
    <div className="max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="sticky top-16 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 py-3 flex items-center justify-between mb-6">
        <div className="text-sm font-medium">
          Question {currentIdx + 1} / {questions.length}
        </div>
        <div className={`text-xl font-mono font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : ''}`}>
          {formatTime(timeLeft)}
        </div>
        <button onClick={() => handleSubmit(false)} className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Question */}
        <div className="lg:col-span-3 card">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
              {q.type?.replace('_', ' ')} · {q.marks} marks
            </span>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!currentAnswer.isMarkedForReview}
                onChange={(e) =>
                  saveAnswer(q._id, { ...currentAnswer, isMarkedForReview: e.target.checked })
                }
              />
              Mark for review
            </label>
          </div>

          <p className="text-lg mb-6 whitespace-pre-wrap">{q.questionText}</p>

          {/* Options */}
          {(q.type === 'mcq_single' || q.type === 'true_false') && (
            <div className="space-y-3">
              {(q.options || []).map((opt) => (
                <label
                  key={opt._id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    (currentAnswer.selectedOptions || [])[0] === opt._id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q._id}`}
                    checked={(currentAnswer.selectedOptions || [])[0] === opt._id}
                    onChange={() =>
                      saveAnswer(q._id, { selectedOptions: [opt._id], isMarkedForReview: currentAnswer.isMarkedForReview })
                    }
                  />
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'mcq_multiple' && (
            <div className="space-y-3">
              {(q.options || []).map((opt) => {
                const selected = (currentAnswer.selectedOptions || []).includes(opt._id);
                return (
                  <label
                    key={opt._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const prev = currentAnswer.selectedOptions || [];
                        const next = selected
                          ? prev.filter((id) => id !== opt._id)
                          : [...prev, opt._id];
                        saveAnswer(q._id, { selectedOptions: next, isMarkedForReview: currentAnswer.isMarkedForReview });
                      }}
                    />
                    <span>{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === 'numeric' && (
            <input
              type="text"
              className="input max-w-xs"
              placeholder="Enter numeric answer"
              value={currentAnswer.numericAnswer || ''}
              onChange={(e) =>
                saveAnswer(q._id, { numericAnswer: e.target.value, isMarkedForReview: currentAnswer.isMarkedForReview })
              }
            />
          )}

          {q.type === 'short_answer' && (
            <textarea
              className="input min-h-[120px]"
              placeholder="Write your answer..."
              value={currentAnswer.textAnswer || ''}
              onChange={(e) =>
                saveAnswer(q._id, { textAnswer: e.target.value, isMarkedForReview: currentAnswer.isMarkedForReview })
              }
            />
          )}

          <div className="flex justify-between mt-8">
            <button
              className="btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
            >
              Previous
            </button>
            <button
              className="btn-primary"
              disabled={currentIdx === questions.length - 1}
              onClick={() => setCurrentIdx((i) => i + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Palette */}
        <div className="card h-fit sticky top-32">
          <h3 className="font-semibold mb-3 text-sm">Question Palette</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((qq, i) => {
              const ans = answers[qq._id];
              let bg = 'bg-gray-100 dark:bg-gray-700';
              if (ans?.isMarkedForReview) bg = 'bg-yellow-400 text-black';
              else if (ans && (ans.selectedOptions?.length || ans.numericAnswer || ans.textAnswer)) {
                bg = 'bg-green-500 text-white';
              }
              return (
                <button
                  key={qq._id}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-9 h-9 rounded text-sm font-medium ${bg} ${
                    i === currentIdx ? 'ring-2 ring-primary-600' : ''
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-xs space-y-1 text-gray-500">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400" /> Review</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-300" /> Not answered</div>
          </div>
        </div>
      </div>
    </div>
  );
}

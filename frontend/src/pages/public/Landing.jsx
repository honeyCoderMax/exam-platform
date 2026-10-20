import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <span className="text-2xl font-bold text-primary-600">ExamPlatform</span>
        <div className="flex gap-3">
          <Link to="/login" className="btn-secondary">Sign in</Link>
          <Link to="/register" className="btn-primary">Start free trial</Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
          Online Exams & Quizzes for<br />
          <span className="text-primary-600">Coaching Centers</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
          Multi-tenant SaaS platform. Create question banks, schedule timed exams with anti-cheating,
          auto-grade results, and get powerful analytics — ready to sell on monthly subscription.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/register" className="btn-primary text-lg px-8 py-3">Start 14-day free trial</Link>
          <Link to="/login" className="btn-secondary text-lg px-8 py-3">View demo</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Question Bank', desc: 'MCQ, multi-select, T/F, numeric, short answer. Bulk CSV upload.' },
          { title: 'Exam Builder', desc: 'Manual or auto-generate by difficulty rules. Schedule & assign batches.' },
          { title: 'Anti-Cheating', desc: 'Server timer, tab-switch detection, fullscreen, auto-submit on violations.' },
          { title: 'Auto Grading', desc: 'Instant scoring with negative marking & partial credit. Manual review for short answers.' },
          { title: 'Analytics', desc: 'Student progress, class averages, question difficulty, score histograms.' },
          { title: 'SaaS Ready', desc: 'Plans, Razorpay, multi-tenant isolation, branding, referral codes.' },
        ].map((f) => (
          <div key={f.title} className="card">
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

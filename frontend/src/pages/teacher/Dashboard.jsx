import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/teacher/questions" className="card hover:border-primary-300 transition">
          <h3 className="font-semibold text-lg">Question Bank</h3>
          <p className="text-sm text-gray-500 mt-1">Create, search, and bulk-upload questions</p>
        </Link>
        <Link to="/teacher/exams" className="card hover:border-primary-300 transition">
          <h3 className="font-semibold text-lg">Exams</h3>
          <p className="text-sm text-gray-500 mt-1">Build, schedule, and publish exams</p>
        </Link>
      </div>
    </div>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/public/Landing';
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import ExamAttempt from './pages/student/ExamAttempt';
import ExamResult from './pages/student/ExamResult';
import QuestionBank from './pages/teacher/QuestionBank';
import ExamBuilder from './pages/teacher/ExamBuilder';
import Layout from './components/layout/Layout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['centeradmin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['teacher', 'centeradmin']}>
              <Layout>
                <Routes>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="questions" element={<QuestionBank />} />
                  <Route path="exams" element={<ExamBuilder />} />
                </Routes>
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/*"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['student']}>
              <Layout>
                <Routes>
                  <Route index element={<StudentDashboard />} />
                  <Route path="exam/:examId" element={<ExamAttempt />} />
                  <Route path="result/:resultId" element={<ExamResult />} />
                </Routes>
              </Layout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

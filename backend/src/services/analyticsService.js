const Result = require('../models/Result');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const User = require('../models/User');

/**
 * Teacher / class analytics for one exam
 */
const getExamAnalytics = async (examId, centerId) => {
  const results = await Result.find({ examId, centerId })
    .populate('studentId', 'name email')
    .sort({ rank: 1 });

  if (results.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      averagePercentage: 0,
      toppers: [],
      scoreDistribution: [],
      questionAnalysis: [],
    };
  }

  const totalAttempts = results.length;
  const sumScore = results.reduce((s, r) => s + r.score, 0);
  const sumPct = results.reduce((s, r) => s + r.percentage, 0);
  const averageScore = Math.round((sumScore / totalAttempts) * 100) / 100;
  const averagePercentage = Math.round((sumPct / totalAttempts) * 100) / 100;

  const toppers = results.slice(0, 10).map((r) => ({
    student: r.studentId,
    score: r.score,
    percentage: r.percentage,
    rank: r.rank,
  }));

  // Score distribution histogram (buckets of 10%)
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 10}%`,
    count: 0,
  }));
  results.forEach((r) => {
    const idx = Math.min(9, Math.floor(r.percentage / 10));
    buckets[idx].count += 1;
  });

  // Question-wise difficulty
  const questionStats = {};
  results.forEach((r) => {
    (r.questionWise || []).forEach((qw) => {
      const qid = qw.questionId.toString();
      if (!questionStats[qid]) {
        questionStats[qid] = { correct: 0, total: 0, skipped: 0, avgTime: 0 };
      }
      questionStats[qid].total += 1;
      if (qw.isCorrect) questionStats[qid].correct += 1;
      if (qw.marksObtained === 0 && !qw.isCorrect) questionStats[qid].skipped += 1;
      questionStats[qid].avgTime += qw.timeSpent || 0;
    });
  });

  const questionIds = Object.keys(questionStats);
  const questions = await Question.find({ _id: { $in: questionIds } }).select(
    'questionText subject difficulty type'
  );
  const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

  const questionAnalysis = questionIds.map((qid) => {
    const s = questionStats[qid];
    const q = qMap.get(qid);
    return {
      questionId: qid,
      questionText: q?.questionText?.slice(0, 120) || '',
      subject: q?.subject,
      difficulty: q?.difficulty,
      percentCorrect: Math.round((s.correct / s.total) * 10000) / 100,
      percentSkipped: Math.round((s.skipped / s.total) * 10000) / 100,
      avgTimeSeconds: Math.round(s.avgTime / s.total),
    };
  });

  return {
    totalAttempts,
    averageScore,
    averagePercentage,
    toppers,
    scoreDistribution: buckets,
    questionAnalysis,
  };
};

/**
 * Student progress across exams
 */
const getStudentProgress = async (studentId, centerId) => {
  const results = await Result.find({ studentId, centerId })
    .populate('examId', 'title schedule')
    .sort({ createdAt: 1 });

  return results.map((r) => ({
    examId: r.examId?._id,
    examTitle: r.examId?.title,
    score: r.score,
    maxScore: r.maxScore,
    percentage: r.percentage,
    rank: r.rank,
    percentile: r.percentile,
    date: r.createdAt,
    subjectWise: r.subjectWise,
  }));
};

/**
 * Center admin dashboard stats
 */
const getCenterDashboard = async (centerId) => {
  const [studentCount, teacherCount, examCount, attemptCount, recentResults] = await Promise.all([
    User.countDocuments({ centerId, role: 'student', isActive: true }),
    User.countDocuments({ centerId, role: 'teacher', isActive: true }),
    Exam.countDocuments({ centerId }),
    Attempt.countDocuments({ centerId, status: { $in: ['submitted', 'auto_submitted'] } }),
    Result.find({ centerId }).sort({ createdAt: -1 }).limit(10).populate('studentId', 'name').populate('examId', 'title'),
  ]);

  return {
    studentCount,
    teacherCount,
    examCount,
    attemptCount,
    recentResults: recentResults.map((r) => ({
      student: r.studentId?.name,
      exam: r.examId?.title,
      score: r.score,
      percentage: r.percentage,
      date: r.createdAt,
    })),
  };
};

module.exports = {
  getExamAnalytics,
  getStudentProgress,
  getCenterDashboard,
};

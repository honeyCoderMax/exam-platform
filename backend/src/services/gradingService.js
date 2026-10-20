const Question = require('../models/Question');
const Result = require('../models/Result');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');

/**
 * Grade a single answer against the question
 * Returns { isCorrect, marksObtained, needsManualReview }
 */
const gradeAnswer = (question, answer, negativeMarking = true) => {
  const maxMarks = question.marks || 0;
  const neg = question.negativeMarks || 0;

  if (!answer) {
    return { isCorrect: false, marksObtained: 0, needsManualReview: false };
  }

  switch (question.type) {
    case 'mcq_single':
    case 'true_false': {
      const correctIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o._id.toString());
      const selected = (answer.selectedOptions || []).map((id) => id.toString());
      const isCorrect =
        selected.length === 1 && correctIds.length === 1 && selected[0] === correctIds[0];
      if (isCorrect) return { isCorrect: true, marksObtained: maxMarks, needsManualReview: false };
      if (selected.length > 0 && negativeMarking && neg > 0) {
        return { isCorrect: false, marksObtained: -neg, needsManualReview: false };
      }
      return { isCorrect: false, marksObtained: 0, needsManualReview: false };
    }

    case 'mcq_multiple': {
      const correctIds = new Set(
        question.options.filter((o) => o.isCorrect).map((o) => o._id.toString())
      );
      const selected = new Set((answer.selectedOptions || []).map((id) => id.toString()));
      if (selected.size === 0) {
        return { isCorrect: false, marksObtained: 0, needsManualReview: false };
      }
      // Full credit only if exact match
      const exact =
        correctIds.size === selected.size &&
        [...correctIds].every((id) => selected.has(id));
      if (exact) return { isCorrect: true, marksObtained: maxMarks, needsManualReview: false };

      // Partial credit: proportion of correct options selected minus wrong ones
      let correctSelected = 0;
      let wrongSelected = 0;
      selected.forEach((id) => {
        if (correctIds.has(id)) correctSelected++;
        else wrongSelected++;
      });
      const partial = Math.max(
        0,
        (correctSelected / correctIds.size) * maxMarks - wrongSelected * (neg || 0)
      );
      return {
        isCorrect: false,
        marksObtained: Math.round(partial * 100) / 100,
        needsManualReview: false,
      };
    }

    case 'numeric': {
      const correct = String(question.correctAnswer || '').trim();
      const given = String(answer.numericAnswer || '').trim();
      const isCorrect = correct !== '' && given === correct;
      if (isCorrect) return { isCorrect: true, marksObtained: maxMarks, needsManualReview: false };
      if (given && negativeMarking && neg > 0) {
        return { isCorrect: false, marksObtained: -neg, needsManualReview: false };
      }
      return { isCorrect: false, marksObtained: 0, needsManualReview: false };
    }

    case 'short_answer':
      return {
        isCorrect: false,
        marksObtained: 0,
        needsManualReview: true,
      };

    default:
      return { isCorrect: false, marksObtained: 0, needsManualReview: false };
  }
};

/**
 * Full grading of an attempt → creates/updates Result
 */
const gradeAttempt = async (attemptId) => {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new Error('Attempt not found');

  const exam = await Exam.findById(attempt.examId).populate('questions.questionId');
  if (!exam) throw new Error('Exam not found');

  const questionMap = new Map();
  exam.questions.forEach((eq) => {
    if (eq.questionId) questionMap.set(eq.questionId._id.toString(), eq.questionId);
  });

  // Also load any questions not populated
  const missingIds = exam.questions
    .filter((eq) => !eq.questionId || typeof eq.questionId === 'string')
    .map((eq) => eq.questionId);
  if (missingIds.length) {
    const qs = await Question.find({ _id: { $in: missingIds } });
    qs.forEach((q) => questionMap.set(q._id.toString(), q));
  }

  const answerMap = new Map();
  (attempt.answers || []).forEach((a) => {
    answerMap.set(a.questionId.toString(), a);
  });

  let totalScore = 0;
  let maxScore = 0;
  const questionWise = [];
  const subjectMap = {};

  for (const eq of exam.questions) {
    const qId = (eq.questionId._id || eq.questionId).toString();
    const question = questionMap.get(qId);
    if (!question) continue;

    const marks = eq.marksOverride != null ? eq.marksOverride : question.marks;
    maxScore += marks;

    const answer = answerMap.get(qId);
    const graded = gradeAnswer(
      { ...question.toObject(), marks },
      answer,
      exam.settings.negativeMarking
    );

    totalScore += graded.marksObtained;

    questionWise.push({
      questionId: question._id,
      isCorrect: graded.isCorrect,
      marksObtained: graded.marksObtained,
      maxMarks: marks,
      timeSpent: answer?.timeSpentSeconds || 0,
      needsManualReview: graded.needsManualReview,
    });

    const subj = question.subject || 'General';
    if (!subjectMap[subj]) subjectMap[subj] = { obtained: 0, total: 0, correct: 0, count: 0 };
    subjectMap[subj].obtained += graded.marksObtained;
    subjectMap[subj].total += marks;
    subjectMap[subj].count += 1;
    if (graded.isCorrect) subjectMap[subj].correct += 1;
  }

  // Clamp score at 0
  totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;

  const subjectWise = Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    obtained: Math.round(data.obtained * 100) / 100,
    total: data.total,
    accuracy: data.count > 0 ? Math.round((data.correct / data.count) * 10000) / 100 : 0,
  }));

  let result = await Result.findOne({ attemptId: attempt._id });
  if (result) {
    result.score = totalScore;
    result.maxScore = maxScore;
    result.percentage = percentage;
    result.subjectWise = subjectWise;
    result.questionWise = questionWise;
    await result.save();
  } else {
    result = await Result.create({
      centerId: attempt.centerId,
      examId: attempt.examId,
      attemptId: attempt._id,
      studentId: attempt.studentId,
      score: totalScore,
      maxScore,
      percentage,
      subjectWise,
      questionWise,
    });
  }

  return result;
};

/**
 * Re-grade all attempts of an exam (after answer key change)
 */
const regradeExam = async (examId) => {
  const attempts = await Attempt.find({
    examId,
    status: { $in: ['submitted', 'auto_submitted'] },
  });

  const results = [];
  for (const attempt of attempts) {
    const r = await gradeAttempt(attempt._id);
    results.push(r);
  }

  // Recalculate ranks
  await calculateRanks(examId);
  return results;
};

/**
 * Assign ranks and percentiles for an exam
 */
const calculateRanks = async (examId) => {
  const results = await Result.find({ examId }).sort({ score: -1, createdAt: 1 });
  const total = results.length;
  if (total === 0) return;

  let rank = 1;
  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i].score < results[i - 1].score) {
      rank = i + 1;
    }
    results[i].rank = rank;
    results[i].percentile = Math.round(((total - rank + 1) / total) * 10000) / 100;
    await results[i].save();
  }
};

module.exports = {
  gradeAnswer,
  gradeAttempt,
  regradeExam,
  calculateRanks,
};

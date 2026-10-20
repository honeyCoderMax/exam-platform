/**
 * Seed script – run with: npm run seed
 * Creates plans, superadmin, demo center, teachers, students, questions, sample exam
 */
const connectDB = require("../config/db");
const Plan = require("../models/Plan");
const User = require("../models/User");
const Center = require("../models/Center");
const Batch = require("../models/Batch");
const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Subscription = require("../models/Subscription");
const { generateCode, slugify } = require("../utils/helpers");
const { superAdmin } = require("../config/env");

const seed = async () => {
  await connectDB();
  console.log("Seeding...");

  // Plans
  await Plan.deleteMany({});
  const plans = await Plan.insertMany([
    {
      name: "Free Trial",
      slug: "free-trial",
      priceMonthlyINR: 0,
      priceMonthlyUSD: 0,
      limits: {
        maxStudents: 20,
        maxExamsPerMonth: 5,
        maxQuestions: 100,
        storageMB: 50,
      },
      features: ["14-day trial", "Basic analytics", "Email support"],
      trialDays: 14,
      sortOrder: 0,
    },
    {
      name: "Starter",
      slug: "starter",
      priceMonthlyINR: 999,
      priceMonthlyUSD: 12,
      limits: {
        maxStudents: 100,
        maxExamsPerMonth: 30,
        maxQuestions: 1000,
        storageMB: 500,
      },
      features: ["All Free features", "CSV export", "Priority support"],
      sortOrder: 1,
    },
    {
      name: "Pro",
      slug: "pro",
      priceMonthlyINR: 2499,
      priceMonthlyUSD: 30,
      limits: {
        maxStudents: 500,
        maxExamsPerMonth: 100,
        maxQuestions: 5000,
        storageMB: 2000,
      },
      features: [
        "All Starter features",
        "Advanced analytics",
        "Custom branding",
        "API access",
      ],
      sortOrder: 2,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      priceMonthlyINR: 7999,
      priceMonthlyUSD: 99,
      limits: {
        maxStudents: 5000,
        maxExamsPerMonth: 500,
        maxQuestions: 50000,
        storageMB: 10000,
      },
      features: ["All Pro features", "Dedicated support", "SLA", "White-label"],
      sortOrder: 3,
    },
  ]);
  console.log("Plans created");

  // Superadmin
  await User.deleteMany({ role: "superadmin" });
  const sa = await User.create({
    name: "Super Admin",
    email: superAdmin.email,
    password: superAdmin.password,
    role: "superadmin",
    isEmailVerified: true,
  });
  console.log("Superadmin:", sa.email);

  // Demo Center
  await Center.deleteMany({ slug: "demo-coaching" });
  const center = await Center.create({
    name: "Demo Coaching Center",
    slug: "demo-coaching",
    email: "admin@democoaching.com",
    phone: "+919876543210",
    referralCode: generateCode(8),
    status: "trial",
  });

  const admin = await User.create({
    name: "Center Admin",
    email: "admin@democoaching.com",
    password: "Admin@123",
    role: "centeradmin",
    centerId: center._id,
    isEmailVerified: true,
  });
  center.owner = admin._id;
  await center.save();

  const trialPlan = plans.find((p) => p.slug === "free-trial");
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);
  await Subscription.create({
    centerId: center._id,
    planId: trialPlan._id,
    status: "trial",
    startDate: now,
    endDate: end,
    trialEndsAt: end,
  });

  const teacher = await User.create({
    name: "Demo Teacher",
    email: "teacher@democoaching.com",
    password: "Teacher@123",
    role: "teacher",
    centerId: center._id,
    isEmailVerified: true,
  });

  const students = await User.insertMany([
    {
      name: "Student One",
      email: "student1@democoaching.com",
      password: "Student@123",
      role: "student",
      centerId: center._id,
      isEmailVerified: true,
    },
    {
      name: "Student Two",
      email: "student2@democoaching.com",
      password: "Student@123",
      role: "student",
      centerId: center._id,
      isEmailVerified: true,
    },
  ]);

  const batch = await Batch.create({
    centerId: center._id,
    name: "JEE 2026 Batch A",
    description: "Demo batch for JEE preparation",
    academicYear: "2025-26",
    teachers: [teacher._id],
    students: students.map((s) => s._id),
  });

  await User.updateMany(
    { _id: { $in: students.map((s) => s._id) } },
    { $set: { batches: [batch._id] } },
  );

  // Sample questions
  const questions = await Question.insertMany([
    {
      centerId: center._id,
      createdBy: teacher._id,
      type: "mcq_single",
      subject: "Physics",
      chapter: "Mechanics",
      topic: "Laws of Motion",
      difficulty: "easy",
      questionText: "Newton's first law is also known as?",
      options: [
        { text: "Law of Inertia", isCorrect: true },
        { text: "Law of Acceleration", isCorrect: false },
        { text: "Law of Action-Reaction", isCorrect: false },
        { text: "Law of Gravitation", isCorrect: false },
      ],
      marks: 4,
      negativeMarks: 1,
      explanation: "Newton's first law is the law of inertia.",
      tags: ["newton", "mechanics"],
    },
    {
      centerId: center._id,
      createdBy: teacher._id,
      type: "mcq_single",
      subject: "Physics",
      chapter: "Mechanics",
      topic: "Laws of Motion",
      difficulty: "medium",
      questionText: "A force of 10 N acts on a 2 kg mass. Acceleration is?",
      options: [
        { text: "5 m/s²", isCorrect: true },
        { text: "20 m/s²", isCorrect: false },
        { text: "2 m/s²", isCorrect: false },
        { text: "10 m/s²", isCorrect: false },
      ],
      marks: 4,
      negativeMarks: 1,
      explanation: "a = F/m = 10/2 = 5 m/s²",
      tags: ["newton", "acceleration"],
    },
    {
      centerId: center._id,
      createdBy: teacher._id,
      type: "true_false",
      subject: "Physics",
      chapter: "Mechanics",
      topic: "Work Energy",
      difficulty: "easy",
      questionText:
        "Work done is zero when force is perpendicular to displacement.",
      options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ],
      marks: 2,
      negativeMarks: 0,
      explanation: "W = F·d·cosθ; cos90° = 0",
      tags: ["work"],
    },
    {
      centerId: center._id,
      createdBy: teacher._id,
      type: "numeric",
      subject: "Mathematics",
      chapter: "Algebra",
      topic: "Quadratic",
      difficulty: "medium",
      questionText: "What is the value of x if x² - 5x + 6 = 0 (smaller root)?",
      correctAnswer: "2",
      marks: 4,
      negativeMarks: 1,
      explanation: "(x-2)(x-3)=0 → x=2 or 3",
      tags: ["quadratic"],
    },
    {
      centerId: center._id,
      createdBy: teacher._id,
      type: "mcq_multiple",
      subject: "Chemistry",
      chapter: "Organic",
      topic: "Hydrocarbons",
      difficulty: "hard",
      questionText: "Which of the following are alkanes?",
      options: [
        { text: "Methane", isCorrect: true },
        { text: "Ethene", isCorrect: false },
        { text: "Propane", isCorrect: true },
        { text: "Acetylene", isCorrect: false },
      ],
      marks: 4,
      negativeMarks: 1,
      explanation: "Alkanes are saturated hydrocarbons: methane, propane.",
      tags: ["alkanes"],
    },
  ]);

  // Sample exam (starts now, ends in 7 days)
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const exam = await Exam.create({
    centerId: center._id,
    createdBy: teacher._id,
    title: "Demo Physics & Chemistry Test",
    description: "Sample exam for demonstration",
    questions: questions.map((q) => ({ questionId: q._id })),
    settings: {
      durationMinutes: 30,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      passingMarks: 8,
      negativeMarking: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      maxAttempts: 2,
    },
    schedule: { startAt, endAt },
    assignedBatches: [batch._id],
    status: "live",
    isPublished: true,
  });

  console.log("\n========== SEED COMPLETE ==========");
  console.log("Superadmin :", superAdmin.email, "/", superAdmin.password);
  console.log("Center Admin:", "admin@democoaching.com / Admin@123");
  console.log("Teacher    :", "teacher@democoaching.com / Teacher@123");
  console.log("Student 1  :", "student1@democoaching.com / Student@123");
  console.log("Student 2  :", "student2@democoaching.com / Student@123");
  console.log("Center slug: demo-coaching");
  console.log("Exam ID    :", exam._id.toString());
  console.log("===================================\n");

  await connectDB.close();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

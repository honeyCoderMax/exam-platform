const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { DataTypes, Op, col, fn, where } = require("sequelize");
const connectDB = require("../config/db");
const sequelize = connectDB.sequelize;

const id = () => crypto.randomBytes(12).toString("hex");
const stringId = (allowNull = true) => ({
  type: DataTypes.STRING(24),
  allowNull,
});
const json = (defaultValue = null) => ({
  type: DataTypes.JSON,
  allowNull: defaultValue === null,
  ...(defaultValue === null ? {} : { defaultValue }),
});
const common = (tableName, attributes, options = {}) =>
  sequelize.define(
    tableName,
    {
      _id: {
        type: DataTypes.STRING(24),
        primaryKey: true,
        allowNull: false,
        defaultValue: id,
        field: "id",
      },
      ...attributes,
    },
    {
      tableName:
        tableName === "AuditLog" ? "auditlogs" : `${tableName.toLowerCase()}s`,
      timestamps: true,
      ...options,
    },
  );

const Center = common("Center", {
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  logo: { type: DataTypes.STRING, defaultValue: "" },
  primaryColor: { type: DataTypes.STRING, defaultValue: "#4F46E5" },
  secondaryColor: { type: DataTypes.STRING, defaultValue: "#06B6D4" },
  owner: stringId(),
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, defaultValue: "" },
  address: { type: DataTypes.STRING, defaultValue: "" },
  referralCode: { type: DataTypes.STRING, unique: true },
  referredBy: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "trial" },
  branding: json({}),
});
const User = common(
  "User",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, defaultValue: "" },
    role: { type: DataTypes.STRING, allowNull: false },
    centerId: stringId(),
    batches: json([]),
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: DataTypes.DATE,
    refreshToken: DataTypes.TEXT,
    avatar: { type: DataTypes.STRING, defaultValue: "" },
  },
  {
    indexes: [
      { unique: true, fields: ["email", "center_id"] },
      { fields: ["center_id", "role"] },
      { fields: ["center_id", "is_active"] },
    ],
  },
);
User.beforeSave(async (user) => {
  if (user.changed("password"))
    user.password = await bcrypt.hash(user.password, 12);
});
User.prototype.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
User.prototype.toJSON = function () {
  const value = this.get({ plain: true });
  delete value.password;
  delete value.refreshToken;
  return value;
};

const Batch = common(
  "Batch",
  {
    centerId: stringId(false),
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    academicYear: { type: DataTypes.STRING, defaultValue: "" },
    teachers: json([]),
    students: json([]),
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { indexes: [{ fields: ["center_id", "name"] }] },
);
const Plan = common("Plan", {
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  priceMonthlyINR: { type: DataTypes.DOUBLE, allowNull: false },
  priceMonthlyUSD: { type: DataTypes.DOUBLE, allowNull: false },
  limits: json({}),
  features: json([]),
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  trialDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});
const Subscription = common(
  "Subscription",
  {
    centerId: stringId(false),
    planId: stringId(false),
    status: { type: DataTypes.STRING, defaultValue: "trial" },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    trialEndsAt: DataTypes.DATE,
    razorpaySubscriptionId: DataTypes.STRING,
    autoRenew: { type: DataTypes.BOOLEAN, defaultValue: true },
    cancelledAt: DataTypes.DATE,
  },
  { indexes: [{ fields: ["center_id"] }, { fields: ["status", "end_date"] }] },
);
const Exam = common(
  "Exam",
  {
    centerId: stringId(false),
    createdBy: stringId(false),
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    questions: json([]),
    settings: json({}),
    schedule: json({}),
    assignedBatches: json([]),
    status: { type: DataTypes.STRING, defaultValue: "draft" },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    indexes: [
      { fields: ["center_id", "status"] },
      { fields: ["center_id", "created_at"] },
    ],
  },
);
const Question = common(
  "Question",
  {
    centerId: stringId(false),
    createdBy: stringId(false),
    type: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    chapter: { type: DataTypes.STRING, defaultValue: "" },
    topic: { type: DataTypes.STRING, defaultValue: "" },
    difficulty: { type: DataTypes.STRING, defaultValue: "medium" },
    questionText: { type: DataTypes.TEXT, allowNull: false },
    options: json([]),
    correctAnswer: { type: DataTypes.TEXT, defaultValue: "" },
    marks: { type: DataTypes.DOUBLE, allowNull: false },
    negativeMarks: { type: DataTypes.DOUBLE, defaultValue: 0 },
    explanation: { type: DataTypes.TEXT, defaultValue: "" },
    tags: json([]),
    imageUrl: { type: DataTypes.STRING, defaultValue: "" },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    indexes: [
      { fields: ["center_id", "subject", "difficulty"] },
      { fields: ["center_id", "created_at"] },
      { fields: ["center_id", "is_active"] },
    ],
  },
);
const Attempt = common(
  "Attempt",
  {
    centerId: stringId(false),
    examId: stringId(false),
    studentId: stringId(false),
    activeAttemptKey: { type: DataTypes.STRING(49), unique: true },
    answers: json([]),
    status: { type: DataTypes.STRING, defaultValue: "in_progress" },
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    submittedAt: DataTypes.DATE,
    endsAt: { type: DataTypes.DATE, allowNull: false },
    timeRemainingSeconds: DataTypes.INTEGER,
    violations: json([]),
    violationCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    currentQuestionIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
    questionOrder: json([]),
  },
  {
    indexes: [
      { fields: ["center_id", "exam_id", "student_id"] },
      { fields: ["student_id", "status"] },
    ],
  },
);
Attempt.beforeSave((attempt) => {
  attempt.activeAttemptKey =
    attempt.status === "in_progress"
      ? `${attempt.examId}:${attempt.studentId}`
      : null;
});
Attempt.prototype.toJSON = function () {
  const value = this.get({ plain: true });
  delete value.activeAttemptKey;
  return value;
};
const Result = common(
  "Result",
  {
    centerId: stringId(false),
    examId: stringId(false),
    attemptId: { ...stringId(false), unique: true },
    studentId: stringId(false),
    score: { type: DataTypes.DOUBLE, defaultValue: 0 },
    maxScore: { type: DataTypes.DOUBLE, defaultValue: 0 },
    percentage: { type: DataTypes.DOUBLE, defaultValue: 0 },
    rank: DataTypes.INTEGER,
    percentile: DataTypes.DOUBLE,
    subjectWise: json([]),
    questionWise: json([]),
    isManuallyGraded: { type: DataTypes.BOOLEAN, defaultValue: false },
    gradedBy: stringId(),
    gradedAt: DataTypes.DATE,
    pdfReportUrl: { type: DataTypes.STRING, defaultValue: "" },
  },
  {
    indexes: [
      { fields: ["center_id", "exam_id", "student_id"] },
      { fields: ["exam_id", "rank"] },
      { fields: ["student_id", "created_at"] },
    ],
  },
);
const Payment = common(
  "Payment",
  {
    centerId: stringId(false),
    subscriptionId: stringId(),
    amount: { type: DataTypes.DOUBLE, allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: "INR" },
    razorpayOrderId: DataTypes.STRING,
    razorpayPaymentId: DataTypes.STRING,
    razorpaySignature: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: "created" },
    invoiceUrl: { type: DataTypes.STRING, defaultValue: "" },
    paidAt: DataTypes.DATE,
    metadata: json(),
  },
  {
    indexes: [
      { fields: ["center_id", "created_at"] },
      { fields: ["razorpay_order_id"] },
    ],
  },
);
const Notification = common(
  "Notification",
  {
    centerId: stringId(),
    userId: stringId(false),
    type: { type: DataTypes.STRING, defaultValue: "general" },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    link: { type: DataTypes.STRING, defaultValue: "" },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { indexes: [{ fields: ["user_id", "is_read", "created_at"] }] },
);
const AuditLog = common(
  "AuditLog",
  {
    centerId: stringId(),
    userId: stringId(),
    action: { type: DataTypes.STRING, allowNull: false },
    resource: { type: DataTypes.STRING, allowNull: false },
    resourceId: DataTypes.STRING,
    ip: DataTypes.STRING,
    userAgent: DataTypes.TEXT,
    metadata: json(),
  },
  {
    indexes: [
      { fields: ["center_id", "created_at"] },
      { fields: ["user_id", "created_at"] },
    ],
  },
);

const jsonFields = new Set([
  "branding",
  "batches",
  "teachers",
  "students",
  "questions",
  "settings",
  "schedule",
  "assignedBatches",
  "options",
  "tags",
  "answers",
  "violations",
  "questionOrder",
  "subjectWise",
  "questionWise",
  "limits",
  "features",
  "metadata",
]);
const sqlOperator = {
  $in: Op.in,
  $nin: Op.notIn,
  $gte: Op.gte,
  $gt: Op.gt,
  $lte: Op.lte,
  $lt: Op.lt,
  $ne: Op.ne,
};
const escapeLike = (value) => String(value).replace(/[\\%_]/g, "\\$&");

const filterValue = (field, value) => {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const conditions = {};
    for (const [operator, operand] of Object.entries(value)) {
      if (operator === "$regex") {
        const pattern = escapeLike(operand);
        if (jsonFields.has(field))
          return where(fn("JSON_SEARCH", col(field), "one", `%${pattern}%`), {
            [Op.ne]: null,
          });
        conditions[Op.like] = `%${pattern}%`;
      } else if (operator === "$options") continue;
      else if (field === "assignedBatches" && operator === "$in") {
        return {
          [Op.or]: operand.map((item) =>
            where(
              fn("JSON_CONTAINS", col(field), JSON.stringify(String(item))),
              1,
            ),
          ),
        };
      } else if (sqlOperator[operator])
        conditions[sqlOperator[operator]] = operand;
    }
    return Object.keys(conditions).length ? conditions : value;
  }
  return value;
};

const toWhere = (filter = {}) => {
  const result = {};
  for (const [field, value] of Object.entries(filter)) {
    if (field === "$or" || field === "$and") {
      result[field === "$or" ? Op.or : Op.and] = value.map(toWhere);
      continue;
    }
    if (field.includes(".")) {
      const [base, ...path] = field.split(".");
      const expression = fn(
        "JSON_UNQUOTE",
        fn("JSON_EXTRACT", col(base), `$.${path.join(".")}`),
      );
      const operand =
        value && typeof value === "object" ? filterValue(field, value) : value;
      result[Op.and] = [...(result[Op.and] || []), where(expression, operand)];
      continue;
    }
    if (
      (field === "assignedBatches" && value?.$in) ||
      (jsonFields.has(field) && value?.$regex)
    ) {
      result[Op.and] = [...(result[Op.and] || []), filterValue(field, value)];
      continue;
    }
    result[field] = filterValue(field, value);
  }
  return result;
};

const project = (value, select) => {
  if (!select) return value;
  const fields = select.split(/\s+/).filter(Boolean);
  const excluded = fields
    .filter((field) => field.startsWith("-"))
    .map((field) => field.slice(1));
  const included = fields.filter(
    (field) => !field.startsWith("-") && !field.startsWith("+"),
  );
  if (included.length)
    return Object.fromEntries(
      [...(included.includes("_id") ? [] : ["_id"]), ...included]
        .filter((key) => key in value)
        .map((key) => [key, value[key]]),
    );
  excluded.forEach((key) => delete value[key]);
  return value;
};

const refs = {
  Center,
  User,
  Batch,
  Plan,
  Subscription,
  Exam,
  Question,
  Attempt,
  Result,
  Payment,
  Notification,
  AuditLog,
};
const relationModel = {
  createdBy: User,
  assignedBatches: Batch,
  examId: Exam,
  studentId: User,
  centerId: Center,
  planId: Plan,
  batches: Batch,
  teachers: User,
  students: User,
};
const populateRecord = async (record, request) => {
  const path = typeof request === "string" ? request : request.path;
  const select = typeof request === "string" ? null : request.select;
  if (path === "questions.questionId") {
    const questions = record.questions || [];
    const ids = questions
      .map((entry) => entry.questionId)
      .filter((value) => typeof value === "string");
    const docs = await Question.findAll({ where: { _id: ids } });
    const byId = new Map(docs.map((doc) => [doc._id, doc.toJSON()]));
    record.setDataValue(
      "questions",
      questions.map((entry) => {
        const question = byId.get(entry.questionId) || entry.questionId;
        if (question && typeof question === "object") {
          const safe = project({ ...question }, select);
          if (select?.includes("options.isCorrect"))
            safe.options = question.options;
          if (select?.includes("-options.isCorrect"))
            safe.options = (safe.options || []).map(
              ({ isCorrect, ...option }) => option,
            );
          return { ...entry, questionId: safe };
        }
        return entry;
      }),
    );
    return;
  }
  const Model = relationModel[path];
  if (!Model) return;
  const value = record.get(path);
  if (value == null) return;
  const many = Array.isArray(value);
  const ids = (many ? value : [value])
    .map((item) => item?._id || item)
    .filter((item) => typeof item === "string");
  const docs = ids.length ? await Model.findAll({ where: { _id: ids } }) : [];
  const byId = new Map(
    docs.map((doc) => [doc._id, project(doc.toJSON(), select)]),
  );
  const populated = many
    ? value.map((item) => byId.get(item?._id || item)).filter(Boolean)
    : byId.get(value?._id || value) || null;
  record.setDataValue(path, populated);
};

class ModelQuery {
  constructor(Model, filter, many) {
    this.Model = Model;
    this.filter = filter;
    this.many = many;
    this.populates = [];
    this.order = [];
    this.offset = undefined;
    this.limitValue = undefined;
    this.selection = null;
    this.asPlain = false;
  }
  populate(path, select) {
    this.populates.push(typeof path === "object" ? path : { path, select });
    return this;
  }
  sort(spec) {
    this.order = Object.entries(spec).map(([key, direction]) => [
      key.replace(/\./g, "_"),
      direction < 0 ? "DESC" : "ASC",
    ]);
    return this;
  }
  skip(value) {
    this.offset = value;
    return this;
  }
  limit(value) {
    this.limitValue = value;
    return this;
  }
  select(value) {
    this.selection = value;
    return this;
  }
  lean() {
    this.asPlain = true;
    return this;
  }
  async exec() {
    const options = { where: toWhere(this.filter) };
    if (this.order.length) options.order = this.order;
    if (this.offset !== undefined) options.offset = this.offset;
    if (this.limitValue !== undefined) options.limit = this.limitValue;
    if (this.selection) {
      const fields = this.selection
        .split(/\s+/)
        .filter(
          (field) => field && !field.startsWith("-") && !field.startsWith("+"),
        );
      if (fields.length) options.attributes = [...new Set(["_id", ...fields])];
      else {
        const excluded = this.selection
          .split(/\s+/)
          .filter((field) => field.startsWith("-"))
          .map((field) => field.slice(1));
        if (excluded.length) options.attributes = { exclude: excluded };
      }
    }
    let records = this.many
      ? await this.Model.findAll(options)
      : await this.Model.findOne(options);
    if (records && this.populates.length) {
      const list = Array.isArray(records) ? records : [records];
      for (const record of list)
        for (const request of this.populates)
          await populateRecord(record, request);
    }
    const asPlain = (record) => (this.asPlain ? record?.toJSON() : record);
    return Array.isArray(records) ? records.map(asPlain) : asPlain(records);
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  catch(reject) {
    return this.exec().catch(reject);
  }
}

for (const Model of Object.values(refs)) {
  Model.find = (filter = {}) => new ModelQuery(Model, filter, true);
  Model.findOne = (filter = {}) => new ModelQuery(Model, filter, false);
  Model.findById = (value) => new ModelQuery(Model, { _id: value }, false);
  Model.sample = (filter, count) =>
    Model.findAll({
      where: toWhere(filter),
      order: sequelize.random(),
      limit: count,
    });
  Model.countDocuments = (filter = {}) =>
    Model.count({ where: toWhere(filter) });
  Model.deleteMany = async (filter = {}) =>
    Model.destroy({ where: toWhere(filter) });
  Model.insertMany = async (items) =>
    Model.bulkCreate(items, { individualHooks: true });
  Model.distinct = async (field, filter = {}) => [
    ...new Set(
      (await Model.find(filter).select(field)).map((item) => item[field]),
    ),
  ];
  Model.updateMany = async (filter, update) => {
    const records = await Model.find(filter);
    for (const record of records) {
      for (const [key, value] of Object.entries(update.$set || update)) {
        if (key === "$inc" || key === "$addToSet") continue;
        record.set(key, value);
      }
      for (const [key, value] of Object.entries(update.$inc || {}))
        record.set(key, Number(record.get(key) || 0) + value);
      for (const [key, value] of Object.entries(update.$addToSet || {})) {
        const values = record.get(key) || [];
        record.set(key, [...new Set([...values, value].map(String))]);
      }
      await record.save();
    }
    return [records.length];
  };
  Model.findOneAndUpdate = async (filter, update) => {
    const record = await Model.findOne(filter);
    if (!record) return null;
    const changes = update.$set || update;
    for (const [key, value] of Object.entries(changes))
      if (!key.startsWith("$")) record.set(key, value);
    for (const [key, value] of Object.entries(update.$inc || {}))
      record.set(key, Number(record.get(key) || 0) + value);
    await record.save();
    return record;
  };
  Model.findOneAndDelete = async (filter) => {
    const record = await Model.findOne(filter);
    if (record) await record.destroy();
    return record;
  };
  Model.findByIdAndUpdate = async (value, update) =>
    Model.findOneAndUpdate({ _id: value }, update);
  Model.prototype.toObject = function () {
    return this.get({ plain: true });
  };
}

module.exports = {
  Center,
  User,
  Batch,
  Plan,
  Subscription,
  Exam,
  Question,
  Attempt,
  Result,
  Payment,
  Notification,
  AuditLog,
  sequelize,
  Op,
};

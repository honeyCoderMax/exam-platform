require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});

const { MongoClient } = require("mongodb");
const connectDB = require("../config/db");
const models = require("../models");

const collections = [
  ["centers", models.Center],
  ["users", models.User],
  ["batches", models.Batch],
  ["plans", models.Plan],
  ["subscriptions", models.Subscription],
  ["exams", models.Exam],
  ["questions", models.Question],
  ["attempts", models.Attempt],
  ["results", models.Result],
  ["payments", models.Payment],
  ["notifications", models.Notification],
  ["auditlogs", models.AuditLog],
];

const convertBson = (value) => {
  if (value && value._bsontype === "ObjectId") return value.toHexString();
  if (Array.isArray(value)) return value.map(convertBson);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, convertBson(item)]),
    );
  }
  return value;
};

const migrate = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required for the one-time import");

  const client = new MongoClient(uri);
  try {
    await connectDB();
    const populatedTables = [];
    for (const [collection, Model] of collections) {
      if (await Model.count()) populatedTables.push(Model.tableName);
    }
    if (populatedTables.length) {
      throw new Error(
        `Import requires empty MySQL tables: ${populatedTables.join(", ")}`,
      );
    }

    await client.connect();
    const database = client.db();
    const transaction = await connectDB.sequelize.transaction();
    try {
      for (const [collection, Model] of collections) {
        const documents = await database
          .collection(collection)
          .find({})
          .toArray();
        const rows = documents.map((document) => {
          const row = convertBson(document);
          row._id = row._id || row.id;
          delete row.__v;
          delete row.id;
          if (Model === models.Attempt && row.status === "in_progress") {
            row.activeAttemptKey = `${row.examId}:${row.studentId}`;
          }
          return row;
        });
        if (rows.length) await Model.bulkCreate(rows, { transaction });
        console.log(`${collection}: ${rows.length} imported`);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    console.log(
      "MongoDB import complete. Verify the MySQL data before switching traffic.",
    );
  } finally {
    await client.close();
    await connectDB.close();
  }
};

migrate().catch((error) => {
  console.error("MongoDB import failed:", error.message);
  process.exitCode = 1;
});

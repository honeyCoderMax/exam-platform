const { Sequelize } = require("sequelize");
const { mysql, nodeEnv } = require("./env");

const sequelize = new Sequelize(mysql.database, mysql.user, mysql.password, {
  host: mysql.host,
  port: mysql.port,
  dialect: "mysql",
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true },
});

const connectDB = async () => {
  try {
    require("../models");
    await sequelize.authenticate();
    await sequelize.sync();
    console.log(
      `MySQL connected: ${mysql.host}:${mysql.port}/${mysql.database}`,
    );
  } catch (error) {
    console.error("MySQL connection error:", error.message);
    process.exit(1);
  }
};

connectDB.sequelize = sequelize;
connectDB.close = () => sequelize.close();

module.exports = connectDB;

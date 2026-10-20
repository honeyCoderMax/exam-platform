const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

const generateAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpiresIn });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });

const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, jwtConfig.refreshSecret);

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };

const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testTimeout: 50_000,
  testMatch: ["**/test/**/*.test.(ts|js)"],
  testEnvironment: "node",
};

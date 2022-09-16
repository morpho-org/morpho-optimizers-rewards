module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testTimeout: 15_000,
  testMatch: ["**/test/**/*.test.(ts|js)"],
  testEnvironment: "node",
};

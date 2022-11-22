import * as dotenv from "dotenv";
dotenv.config();

export default {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testTimeout: 50_000,
  testMatch: ["**/test/**/*.test.(ts|js)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ["./test/jest.matchers.ts"],
};

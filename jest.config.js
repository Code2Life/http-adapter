module.exports = {
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.json",
    },
  },
  moduleFileExtensions: [
    "js",
    "ts",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  testMatch: [
    "**/test/**/*.test.(ts|js)",
  ],
  reporters: ["default", "jest-junit"],
  testEnvironment: "node",
  preset: "ts-jest",
};
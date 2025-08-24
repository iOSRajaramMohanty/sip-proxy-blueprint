module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    "app/**/*.js",
    "!app/test/**",
    "!app/**/*.test.js",
    "!app/healthcheck.js",
  ],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  testPathIgnorePatterns: ["/node_modules/", "/coverage/"],
  setupFilesAfterEnv: [],
  verbose: true,
};

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'     // se for JS puro, ou
    // '^.+\\.ts$': 'ts-jest'      // se você usar TS
  },
  testMatch: ['**/__tests__/**/*.test.js']
}

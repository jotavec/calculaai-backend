/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Encontre testes em __tests__ e arquivos *.test.js
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],

  // Transpile com Babel (Node atual)
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },

  // Deixe o Jest mais previsível
  clearMocks: true,
  restoreMocks: true,

  // Ignorar pastas geradas
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/build/', '<rootDir>/coverage/'],

  // Cobertura
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Arquivos de setup (opcional)
  // setupFiles: ['<rootDir>/.jest/env.js'],
  // setupFilesAfterEnv: ['<rootDir>/.jest/setup.js'],

  // Tempo padrão p/ testes mais lentos (ex.: integrações)
  testTimeout: 10000,

  verbose: true,
};

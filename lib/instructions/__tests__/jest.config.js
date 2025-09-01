// Jest Configuration for Instructions System Testing
// Google-focused testing configuration

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript transformation
  preset: 'ts-jest',
  
  // Root directory for tests
  rootDir: './',
  
  // Test file patterns (Google-focused)
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/out/'
  ],
  
  // Module name mapping for TypeScript paths
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../../../'
  }),
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage configuration (Google-focused)
  collectCoverage: true,
  collectCoverageFrom: [
    '../**/*.ts',
    '!../**/*.d.ts',
    '!../**/*.test.ts',
    '!../__tests__/**',
    // Focus on Google integration files
    '../integration-hooks.ts',
    '../analysis-integration.ts',
    '../ia-processing-engine.ts',
    '../instruction-service.ts'
  ],
  
  // Coverage thresholds (relaxed for MVP)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Test timeout (increased for AI processing)
  testTimeout: 30000,
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: '../../../tsconfig.json'
    }]
  },
  
  // Mock modules that shouldn't be tested directly
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../$1'
  },
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: false
    }
  },
  
  // Test reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }]
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Test environment options
  testEnvironmentOptions: {
    // Node environment options
  },
  
  // Max worker processes (adjust based on system)
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache'
};
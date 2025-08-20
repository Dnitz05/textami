// jest.setup.js
// TEXTAMI PHASE 2 - ESSENTIAL JEST SETUP
// FOCUS: Basic testing environment configuration

import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock window.URL.createObjectURL
Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
})

// Mock File constructor for file upload tests
global.File = class MockFile {
  constructor(parts, filename, props = {}) {
    this.parts = parts
    this.name = filename
    this.size = parts.reduce((acc, part) => acc + part.length, 0)
    this.type = props.type || ''
    this.lastModified = Date.now()
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }
}

// Mock Blob for testing
global.Blob = class MockBlob {
  constructor(parts = [], props = {}) {
    this.parts = parts
    this.size = parts.reduce((acc, part) => acc + part.length, 0)
    this.type = props.type || ''
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }
}

// Suppress console warnings for tests
const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})
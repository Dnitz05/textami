// jest.setup.js
// TEXTAMI PHASE 2 - ESSENTIAL JEST SETUP
// FOCUS: Basic testing environment configuration

import '@testing-library/jest-dom'

// Mock URL constructor for Node.js environment
global.URL = class MockURL {
  constructor(url, base) {
    if (base) {
      this.href = new URL(url, base).href
    } else {
      this.href = url
    }
    this.origin = this.href.split('/').slice(0, 3).join('/')
    this.pathname = this.href.split('/').slice(3).join('/').split('?')[0] || '/'
    this.search = this.href.includes('?') ? '?' + this.href.split('?')[1].split('#')[0] : ''
    this.searchParams = new MockURLSearchParams(this.search)
  }
}

global.URLSearchParams = class MockURLSearchParams {
  constructor(search = '') {
    this.params = new Map()
    if (search.startsWith('?')) search = search.slice(1)
    if (search) {
      search.split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''))
      })
    }
  }
  
  get(key) {
    return this.params.get(key)
  }
  
  set(key, value) {
    this.params.set(key, value)
  }
  
  has(key) {
    return this.params.has(key)
  }
}

// Mock Next.js Request/Response for API route testing
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
    this._bodyUsed = false
  }
  
  async json() {
    if (this._bodyUsed) throw new Error('Body already read')
    this._bodyUsed = true
    return this.body ? JSON.parse(this.body) : {}
  }
  
  async text() {
    if (this._bodyUsed) throw new Error('Body already read')
    this._bodyUsed = true
    return this.body || ''
  }
}

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
  }
  
  static json(body, options = {}) {
    return new Response(JSON.stringify(body), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
}

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

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.OPENAI_API_KEY = 'sk-test-key'

// Mock OpenAI for API tests
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    }
  }))
}))

// Mock PizZip and docxtemplater for DOCX processing
jest.mock('pizzip')
jest.mock('docxtemplater')

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    docs: jest.fn(() => ({
      documents: {
        get: jest.fn()
      }
    })),
    drive: jest.fn(() => ({
      files: {
        list: jest.fn(),
        get: jest.fn()
      }
    })),
    sheets: jest.fn(() => ({
      spreadsheets: {
        get: jest.fn(),
        values: {
          get: jest.fn()
        }
      }
    }))
  }
}))

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    getToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    getTokenInfo: jest.fn(),
    request: jest.fn(),
    generateAuthUrl: jest.fn(),
    on: jest.fn()
  }))
}))
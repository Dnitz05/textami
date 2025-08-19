# TEXTAMI - ARCHITECTURAL RULES & DEVELOPMENT GUIDELINES

## PROJECT OVERVIEW
**Textami** is a professional document generator MVP using Next.js 15.4.6 + Supabase + Docxtemplater Premium (€1,250 investment). This document establishes the architectural foundation with ZERO technical debt tolerance.

## FUNDAMENTAL PRINCIPLES

### 🚫 ZERO TECHNICAL DEBT POLICY
- **NO temporary solutions** - Everything must be production-ready from day one
- **NO shortcuts** - Proper validation, error handling, and security at all times
- **NO 'any' types** - Strict TypeScript enforcement across the entire codebase
- **NO workarounds** - Address root causes, not symptoms

### 🔒 SECURITY FIRST APPROACH
- **user_id verification** MANDATORY for ALL database operations
- **RLS (Row Level Security)** enabled on ALL tables
- **Authentication required** for ALL protected routes and API endpoints
- **Input validation** at every entry point
- **Error handling** that doesn't expose system internals

### 📊 DATABASE INTEGRITY
- **Complete schema** with proper constraints, indexes, and triggers
- **Type safety** with generated TypeScript types from Supabase
- **Audit trail** via usage_logs for all significant operations
- **Credit management** with proper tracking and limits

## ARCHITECTURAL STACK

### Core Technologies
- **Framework**: Next.js 15.4.6 with App Router
- **Database**: Supabase (PostgreSQL) with RLS
- **Authentication**: Supabase Auth
- **TypeScript**: Strict mode, zero 'any' types
- **Document Processing**: Docxtemplater Premium modules

### Project Structure
```
textami/
├── .claude/                    # Development guidelines
├── app/                       # Next.js App Router pages
│   ├── (auth)/               # Authentication pages
│   └── dashboard/            # Protected dashboard area
├── components/               # Reusable UI components  
├── hooks/                   # Custom React hooks
├── lib/                     # Utility libraries
│   ├── auth/               # Authentication & permissions
│   ├── errors/             # Custom error classes
│   └── supabase/           # Database client config
├── providers/              # React context providers
├── supabase/              # Database migrations & config
├── types/                 # TypeScript type definitions
└── middleware.ts          # Route protection & security
```

## DEVELOPMENT RULES

### 1. DATABASE OPERATIONS
- **ALWAYS** use RLS policies for data access control
- **ALWAYS** validate user ownership before resource operations
- **ALWAYS** use the generated database types from `types/database.types.ts`
- **NEVER** bypass authentication checks
- **NEVER** perform raw SQL without proper parameterization

### 2. ERROR HANDLING
- **USE** custom error classes from `lib/errors/custom-errors.ts`
- **PROVIDE** meaningful error codes and messages
- **LOG** errors properly without exposing sensitive information
- **HANDLE** both operational and system errors appropriately
- **IMPLEMENT** proper error boundaries in React components

### 3. TYPESCRIPT ENFORCEMENT
- **ZERO** usage of `any` type - use proper typing always
- **STRICT** mode enabled with all strict checks
- **INTERFACES** for all object structures
- **UNION TYPES** for constrained string values
- **GENERICS** for reusable type-safe functions

### 4. AUTHENTICATION & AUTHORIZATION
- **VERIFY** user authentication on all protected routes
- **CHECK** resource ownership before any operations
- **USE** middleware for route-level protection
- **IMPLEMENT** proper session management
- **MAINTAIN** audit trails for security events

### 5. FILE ORGANIZATION
- **CLEAR** separation between client and server code
- **CONSISTENT** naming conventions (camelCase for variables, PascalCase for components)
- **LOGICAL** grouping of related functionality
- **PROPER** import/export organization
- **DOCUMENTATION** for complex business logic

### 6. PERFORMANCE & SCALABILITY
- **OPTIMIZE** database queries with proper indexes
- **IMPLEMENT** pagination for large data sets
- **USE** React hooks for state management
- **MINIMIZE** unnecessary re-renders
- **CONSIDER** loading states and skeleton screens

## PHASE-BASED DEVELOPMENT

### Phase 0: Architectural Foundations ✅
- [x] Complete database schema with RLS
- [x] TypeScript types generation
- [x] Error management system
- [x] Authentication & permissions utilities
- [x] User management hooks
- [x] Route protection middleware
- [x] Session context providers
- [x] Authentication pages (login/register)
- [x] Auxiliary type definitions
- [x] This architectural documentation

### Phase 1: Core MVP Features (NEXT)
- [ ] Dashboard home page
- [ ] Template upload & management
- [ ] Data source handling (Excel/CSV)
- [ ] Variable mapping interface
- [ ] Document generation engine
- [ ] File storage integration

### Phase 2: Advanced Features
- [ ] Batch document generation
- [ ] Premium Docxtemplater features
- [ ] Advanced template editor
- [ ] Analytics dashboard
- [ ] User settings & preferences

### Phase 3: Polish & Optimization
- [ ] Performance optimizations
- [ ] Advanced error handling
- [ ] Comprehensive testing
- [ ] Production deployment
- [ ] Monitoring & alerting

## TESTING STRATEGY

### Unit Testing
- **JEST** for logic and utility functions
- **React Testing Library** for component testing
- **MOCK** external dependencies appropriately
- **COVERAGE** target of 80%+ for critical paths

### Integration Testing
- **API route** testing with proper authentication
- **Database operation** testing with test data
- **Authentication flow** testing
- **File processing** pipeline testing

### End-to-End Testing
- **Playwright** for complete user workflows
- **CRITICAL paths** must have E2E coverage
- **AUTHENTICATION** flows fully tested
- **ERROR scenarios** properly validated

## CODE QUALITY STANDARDS

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### ESLint Rules
- **No unused variables** - Clean up all imports and declarations
- **Consistent naming** - Follow established conventions
- **Proper async/await** - No dangling promises
- **React hooks rules** - Proper dependency arrays

### Code Review Checklist
- [ ] TypeScript compilation without errors
- [ ] All 'any' types eliminated
- [ ] Proper error handling implemented
- [ ] Authentication checks in place
- [ ] Database operations use RLS
- [ ] User experience considerations addressed
- [ ] Performance implications considered
- [ ] Security vulnerabilities assessed

## DEPLOYMENT REQUIREMENTS

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application Configuration  
NEXT_PUBLIC_APP_URL=
NODE_ENV=production

# File Storage
NEXT_PUBLIC_STORAGE_BUCKET=
```

### Build Process
1. **TypeScript compilation** must pass without errors
2. **ESLint checks** must pass without warnings
3. **Unit tests** must have 80%+ coverage
4. **Integration tests** must pass completely
5. **Build optimization** for production bundles

### Monitoring Requirements
- **Error tracking** with proper context
- **Performance monitoring** for key metrics
- **Database query** performance tracking
- **User authentication** event logging
- **Business metric** dashboards

## SECURITY CHECKLIST

### Authentication Security
- [ ] Proper session management
- [ ] Token expiration handling
- [ ] Multi-factor authentication support ready
- [ ] Password strength requirements
- [ ] Account lockout protection

### Database Security
- [ ] RLS policies on all tables
- [ ] User ownership verification
- [ ] Input sanitization
- [ ] SQL injection protection
- [ ] Audit logging enabled

### API Security
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Proper HTTP status codes
- [ ] CORS configuration secure
- [ ] Error messages don't leak info

### File Security
- [ ] File type validation
- [ ] File size limits enforced
- [ ] Virus scanning integration ready
- [ ] Storage bucket permissions correct
- [ ] Download URL expiration

## MAINTENANCE PROCEDURES

### Regular Tasks
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization review
- **Annually**: Architecture and technology review

### Emergency Procedures
- **Database rollback** procedures documented
- **Service degradation** response plans
- **Security incident** response protocol
- **Data recovery** procedures tested

## SUCCESS METRICS

### Technical Metrics
- **Zero** TypeScript compilation errors
- **Zero** ESLint warnings in production
- **80%+** test coverage maintained
- **<2s** average page load time
- **99.9%** uptime target

### Business Metrics
- **User registration** conversion rate
- **Document generation** success rate
- **Customer satisfaction** scores
- **Support ticket** resolution time
- **Feature adoption** rates

---

**Remember**: This is a €1,250 Docxtemplater Premium investment. Every line of code must reflect production-ready quality. No exceptions, no technical debt, no shortcuts.

**Last Updated**: 2025-01-19
**Version**: 1.0.0
**Status**: Phase 0 Complete ✅
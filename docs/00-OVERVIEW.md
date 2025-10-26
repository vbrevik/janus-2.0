# Janus 2.0 - System Overview

## Document Purpose

This document provides a **high-level overview** of Janus 2.0, its purpose, goals, and guiding principles. Start here to understand the "why" before diving into the "how".

---

## 1. **What is Janus 2.0?**

### 1.1 Elevator Pitch
**Janus 2.0** is a **simple, fast, and secure** personnel and access control management system for high-security, air-gapped environments.

### 1.2 Core Purpose
Manage **personnel records**, **vendor relationships**, and **three-tier access control** (Computer, Data, Physical) with complete audit trails and compliance reporting.

### 1.3 Target Environment
- **Air-gapped networks** (no internet connectivity)
- **High-security facilities** (government, defense, classified)
- **100-1000 personnel**
- **Strict compliance** requirements (audit trails, reporting)

---

## 2. **Why Janus 2.0? (Not 1.x)**

### 2.1 The Janus 1.0 Problem

Janus 1.0 was **functionally complete** but **architecturally over-complex**:

**Problems**:
- 🔴 **Over-engineered**: 4 abstraction layers for simple operations
- 🔴 **Too complex**: Custom DI container, Repository/Service/Controller pattern
- 🔴 **Slow builds**: 2-3 minute TypeScript builds
- 🔴 **Maintenance burden**: 10 specialized agents, 4 tools to sync
- 🔴 **TypeScript errors**: 103 compilation errors at peak
- 🔴 **Incomplete features**: 27+ mock data instances
- 🔴 **Wrong technology**: Node.js instead of Rust (per requirements)

**Result**: Working system that is **too complex to maintain**.

### 2.2 The Janus 2.0 Solution

Janus 2.0 is a **complete rewrite** focused on **simplicity**:

**Solutions**:
- ✅ **Simple architecture**: Direct database access, no unnecessary layers
- ✅ **Rust backend**: Fast builds (< 30 sec), compile-time safety
- ✅ **Fewer agents**: 5 capable agents, not 10+ specialized
- ✅ **Single source of truth**: Git, not 4 synchronized tools
- ✅ **Complete features**: No mock data, no TODO comments
- ✅ **Right technology**: Rust backend (per user requirements)

**Result**: Working system that is **simple to maintain**.

---

## 3. **Core Principles**

### 3.1 "Simplicity Over Complexity"

**What it means**:
- Direct solutions over abstract patterns
- Standard libraries over custom implementations
- Less code is better code
- Obvious over clever

**Examples**:
- ✅ Query database directly in handlers (not Repository → Service → Controller)
- ✅ Use framework's built-in state management (not custom DI container)
- ✅ REST API (not GraphQL)
- ✅ Monolith (not microservices)

### 3.2 "Complete Over Perfect"

**What it means**:
- Working features over perfect architecture
- 100% complete over 80% of many features
- Real implementations over mock data
- Ship features, not abstractions

**Examples**:
- ✅ Implement feature completely or don't implement it
- ✅ No TODO comments in production code
- ✅ No mock data in "complete" features
- ✅ Feature flags for incomplete work

### 3.3 "Fast Over Flexible"

**What it means**:
- Performance is a feature
- Fast builds enable fast iteration
- Fast feedback loops improve quality
- Optimize for the common case

**Examples**:
- ✅ Rust backend (10-100x faster than Node.js)
- ✅ Direct SQL queries (faster than ORM)
- ✅ < 30 second builds (vs 2-3 minutes)
- ✅ < 50ms API responses (vs 200ms)

### 3.4 "Clear Over Clever"

**What it means**:
- Obvious code over clever abstractions
- Self-documenting over heavily commented
- Simple patterns over design patterns
- Readable over terse

**Examples**:
- ✅ Clear function names (not abbreviations)
- ✅ Explicit code (not implicit magic)
- ✅ Standard patterns (not custom abstractions)
- ✅ Junior developer can understand in 1 day

### 3.5 "Focused Over Comprehensive"

**What it means**:
- Core features well done
- One thing at a time
- Depth over breadth
- MVP before features

**Examples**:
- ✅ Complete MVP 1 before starting MVP 2
- ✅ Essential features only in MVP
- ✅ No feature creep (AI, BPMN, etc. later)
- ✅ Remove features if not essential

---

## 4. **What Makes Janus 2.0 Different**

### 4.1 Architectural Differences

| Aspect | Janus 1.0 | Janus 2.0 | Impact |
|--------|-----------|-----------|---------|
| **Layers** | 4 (Controller → Service → Repository → DB) | 1 (Handler → DB) | **75% simpler** |
| **DI Container** | Custom (200+ lines) | Framework built-in | **Eliminated** |
| **Build Time** | 2-3 minutes (TypeScript) | < 30 seconds (Rust) | **6x faster** |
| **API Response** | 200ms average | < 50ms average | **4x faster** |
| **Dependencies** | 80+ direct | ~40 direct | **50% fewer** |
| **Code Volume** | ~27,000 lines | ~13,500 lines | **50% less** |

### 4.2 Development Differences

| Aspect | Janus 1.0 | Janus 2.0 | Impact |
|--------|-----------|-----------|---------|
| **Agents** | 10 specialized | 5 capable | **50% simpler** |
| **Tools** | 4 (Linear, Pieces, scratchpad, notebook) | 1 (Git) | **75% simpler** |
| **Sync Time** | 20-30 min/day | 0 min/day | **Eliminated** |
| **Mock Data** | 27+ instances | 0 instances | **Eliminated** |
| **TODO Comments** | 50+ in production | 0 in production | **Eliminated** |

### 4.3 Technology Differences

| Aspect | Janus 1.0 | Janus 2.0 | Rationale |
|--------|-----------|-----------|-----------|
| **Backend** | Node.js/Express/TypeScript | Rust/Rocket | Per user requirements, performance |
| **Architecture** | Repository/Service/Controller | Direct handlers | Simplicity |
| **Authentication** | Session-based | JWT | Stateless, scalable |
| **Deployment** | Multiple scripts | `docker-compose up` | Single command |

---

## 5. **What Janus 2.0 Does**

### 5.1 Core Features (MVP 1)

✅ **Authentication**
- Username/password login
- JWT-based sessions
- Role-based access control (RBAC)

✅ **Personnel Management**
- CRUD operations (Create, Read, Update, Delete)
- Clearance level tracking (NONE, CONFIDENTIAL, SECRET, TOP_SECRET)
- Department and position tracking
- Vendor assignment

✅ **Vendor Management**
- CRUD operations
- Vendor hierarchy (parent-child relationships)
- Vendor types (CONTRACTOR, SUPPLIER, PARTNER, INTERNAL)

✅ **Basic Access Control**
- Role-based permissions
- Four roles: SYSTEM_ADMIN, ADMIN, SECURITY_OFFICER, USER
- Permission enforcement at API level

### 5.2 Advanced Features (MVP 2)

✅ **Three-Tier Access Control**
- **Computer Access**: System-level access grants
- **Data Access**: Classification-based access (UNCLASSIFIED → TOP_SECRET)
- **Physical Access**: Zone-based access with time restrictions

✅ **Access Card Management**
- Issue physical access cards
- PIN-based verification
- Card status tracking (ACTIVE, SUSPENDED, LOST, EXPIRED)

✅ **Clearance Management**
- Clearance level hierarchy
- Clearance expiration tracking
- Automatic access revocation on expiry

### 5.3 Compliance Features (MVP 2)

✅ **Audit Logging**
- Complete audit trail for all data modifications
- Who, what, when, from where
- 7-year retention

✅ **Compliance Reporting**
- Active personnel by clearance level
- Expiring clearances (30-day alerts)
- Access grants by user
- Security incidents report

---

## 6. **What Janus 2.0 Doesn't Do (MVP)**

### 6.1 Out of Scope for MVP

❌ **Advanced Features** (Future):
- BPMN workflow modeling
- Contract management
- AI integration (Ollama, semantic search)
- Advanced analytics dashboards
- Quality metrics calculations
- Mobile application

❌ **Complex Infrastructure** (Future):
- Microservices architecture
- Message queues (RabbitMQ, Kafka)
- Service mesh
- Kubernetes orchestration
- Multi-tenancy

❌ **Advanced Integrations** (Future):
- SSO/SAML authentication
- LDAP/Active Directory sync
- Email notifications
- Slack/Teams integration
- Excel/PDF export

### 6.2 Why These Are Out of Scope

**Reason**: **Focus on core features first**.

Complete one MVP at a time:
1. **MVP 1**: Auth + Personnel + Vendors + Basic RBAC
2. **MVP 2**: Three-tier access control + Audit
3. **MVP 3**: (Future) Advanced features

**Don't repeat Janus 1.0 mistake**: Trying to build everything simultaneously.

---

## 7. **Success Criteria**

### 7.1 Technical Success

Janus 2.0 is successful when:

✅ **Performance**
- Backend builds in < 30 seconds
- API response time < 50ms (p95)
- Frontend builds in < 10 seconds

✅ **Quality**
- 80% unit test coverage
- 100% API endpoint coverage
- Zero critical security vulnerabilities

✅ **Simplicity**
- Junior developer productive in 1 day
- Zero abstraction layers between API and database
- Single command deployment

✅ **Completeness**
- No mock data in production code
- No TODO comments in production code
- All features fully implemented

### 7.2 Business Success

Janus 2.0 is successful when:

✅ **Usability**
- Users can manage personnel in < 5 minutes of training
- All critical workflows complete in < 3 clicks
- 95% of tasks completable without documentation

✅ **Reliability**
- 99.9% uptime
- Zero data loss
- < 1 hour recovery time

✅ **Compliance**
- Complete audit trail
- Compliance reports generated on-demand
- 7-year data retention

---

## 8. **Target Users**

### 8.1 Primary Users

**Security Administrators**
- Manage personnel records
- Grant and revoke access
- Generate compliance reports
- Monitor security incidents

**System Administrators**
- Manage system configuration
- User and role management
- Backup and recovery
- System monitoring

**Security Officers**
- Review access requests
- Approve clearance levels
- Audit access logs
- Generate reports

### 8.2 Secondary Users

**End Users**
- View their own access levels
- Request access changes
- Update personal information

---

## 9. **Non-Functional Goals**

### 9.1 Performance
- API response time: < 50ms (p95)
- Backend build time: < 30 seconds
- Frontend build time: < 10 seconds
- Database queries: < 10ms

### 9.2 Security
- Password hashing: bcrypt (cost 12)
- Authentication: JWT with 8-hour expiry
- Authorization: Role-based access control
- Audit: Complete audit trail

### 9.3 Reliability
- Uptime: 99.9% (< 43 min/month downtime)
- Data loss: Zero tolerance
- Recovery time: < 1 hour
- Backup: Daily automated

### 9.4 Maintainability
- Code complexity: < 10 cyclomatic complexity
- Documentation: Public functions documented
- Dependencies: < 20 backend, < 30 frontend
- Onboarding: Junior developer productive in 1 day

### 9.5 Usability
- Responsive: Mobile, tablet, desktop
- Accessible: WCAG 2.1 Level AA
- Intuitive: 95% tasks without documentation
- Fast: Workflows complete in < 3 clicks

---

## 10. **Development Philosophy**

### 10.1 "Start with Backend" (User Preference)

**Always**:
1. Design database schema
2. Implement backend API
3. Test backend thoroughly
4. Then implement frontend

**Why**:
- Backend is the source of truth
- API contract drives frontend
- Backend errors are expensive
- Backend testing is easier

### 10.2 "One MVP at a Time"

**Always**:
1. Complete MVP 1 (100% done)
2. Deploy and test MVP 1
3. Then start MVP 2

**Why**:
- Avoid Janus 1.0 mistake (many partial features)
- Complete features provide value
- Easier to test and debug
- Clear progress tracking

### 10.3 "Simple First, Optimize Later"

**Always**:
1. Implement simplest solution
2. Measure performance
3. Optimize if needed

**Why**:
- Premature optimization wastes time
- Simple code is maintainable
- Measure before optimizing
- Most code doesn't need optimization

---

## 11. **Roadmap**

### 11.1 Phase 1: MVP 1 (Weeks 1-2)
- ✅ Authentication (login, JWT, RBAC)
- ✅ Personnel CRUD
- ✅ Vendor CRUD
- ✅ Basic dashboard
- ✅ 100% test coverage

### 11.2 Phase 2: MVP 2 (Weeks 3-4)
- ✅ Three-tier access control
- ✅ Access card management
- ✅ Clearance expiration
- ✅ Audit logging
- ✅ Compliance reporting

### 11.3 Phase 3: Polish (Weeks 5-6)
- ✅ Performance optimization
- ✅ UX improvements
- ✅ Documentation
- ✅ Deployment guides

### 11.4 Phase 4: Advanced Features (Future)
- ⏳ Advanced analytics
- ⏳ AI integration
- ⏳ Advanced workflows
- ⏳ Mobile app

---

## 12. **Key Metrics**

### 12.1 Development Metrics
- Backend build time: < 30 seconds ✅ Target
- Frontend build time: < 10 seconds ✅ Target
- Lines of code: ~13,500 (vs 27,000 in 1.0)
- Dependencies: ~40 (vs 80+ in 1.0)

### 12.2 Performance Metrics
- API response time: < 50ms (p95) ✅ Target
- Database query time: < 10ms ✅ Target
- Memory usage: < 100MB ✅ Target
- Startup time: < 5 seconds ✅ Target

### 12.3 Quality Metrics
- Unit test coverage: 80%+ ✅ Target
- Integration test coverage: 100% endpoints ✅ Target
- E2E test coverage: Critical paths ✅ Target
- Security vulnerabilities: 0 ✅ Target

---

## Summary

**Janus 2.0** is a **complete rewrite** of Janus 1.0 with one goal:

> **"The simplest system that could possibly work"**

**Key Changes**:
- 🚀 Rust backend (not Node.js)
- 🎯 Simple architecture (not over-engineered)
- ⚡ Fast builds (30 sec, not 3 min)
- 📦 Complete features (no mocks, no TODOs)
- 🛠️ Single source of truth (Git, not 4 tools)

**Next Steps**: Read `09-LESSONS-LEARNED.md` to understand what NOT to do.

---

*Janus 2.0 - Secure, Simple, and Fast*


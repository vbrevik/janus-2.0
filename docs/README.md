# Janus 2.0 - Complete System Documentation

## Overview

Janus 2.0 is a **complete reimagining** of the Janus Security Clearance System, designed from the ground up to be **simple, fast, and maintainable**. This documentation provides comprehensive, AI-readable specifications for building Janus 2.0.

## 🎯 **Core Philosophy**

**"Simplicity over Complexity, Clarity over Abstraction"**

Janus 2.0 is built on these principles:
- **Simple beats complex** - Direct solutions over elaborate abstractions
- **Rust for backend** - Performance, safety, and modern development
- **Clear separation** - Clean boundaries between frontend and backend
- **Pragmatic choices** - Use the right tool for the job, not the most impressive
- **Developer experience** - Easy to understand, easy to maintain
- **Production first** - Built for deployment, not just development

## 📚 **Documentation Structure**

Read these documents in order for complete understanding:

### Foundation Documents
1. **[00-OVERVIEW.md](00-OVERVIEW.md)** - Vision, goals, and principles
2. **[01-REQUIREMENTS.md](01-REQUIREMENTS.md)** - Complete functional and non-functional requirements
3. **[09-LESSONS-LEARNED.md](09-LESSONS-LEARNED.md)** - Critical lessons from Janus 1.0 (READ THIS FIRST!)

### Architecture & Design
4. **[02-ARCHITECTURE.md](02-ARCHITECTURE.md)** - System architecture and design patterns
5. **[03-TECHNOLOGY-STACK.md](03-TECHNOLOGY-STACK.md)** - Technology choices with rationale
6. **[04-DATA-MODEL.md](04-DATA-MODEL.md)** - Database schema and relationships
7. **[05-API-DESIGN.md](05-API-DESIGN.md)** - REST API structure and conventions

### Implementation Guides
8. **[06-FRONTEND-STRUCTURE.md](06-FRONTEND-STRUCTURE.md)** - Frontend organization and patterns
9. **[07-DEPLOYMENT.md](07-DEPLOYMENT.md)** - Deployment strategy and infrastructure
10. **[08-DEVELOPMENT-WORKFLOW.md](08-DEVELOPMENT-WORKFLOW.md)** - Development process and tools

### Migration & Planning
11. **[10-MIGRATION-STRATEGY.md](10-MIGRATION-STRATEGY.md)** - Migration from Janus 1.0
12. **[11-IMPLEMENTATION-PLAN.md](11-IMPLEMENTATION-PLAN.md)** - Phased implementation roadmap

## 🚀 **Quick Start for AI Agents**

### For Backend Development
1. Read: `09-LESSONS-LEARNED.md` (understand what NOT to do)
2. Read: `02-ARCHITECTURE.md` (understand the structure)
3. Read: `03-TECHNOLOGY-STACK.md` (understand Rust stack)
4. Read: `04-DATA-MODEL.md` (understand data structures)
5. Read: `05-API-DESIGN.md` (implement endpoints)

### For Frontend Development
1. Read: `09-LESSONS-LEARNED.md` (understand what NOT to do)
2. Read: `02-ARCHITECTURE.md` (understand the structure)
3. Read: `06-FRONTEND-STRUCTURE.md` (understand React patterns)
4. Read: `05-API-DESIGN.md` (understand API contracts)

### For Full-Stack Development
1. Read all documents in order
2. Start with backend (per user preference)
3. Follow the implementation plan in `11-IMPLEMENTATION-PLAN.md`

## 🎓 **Key Improvements Over Janus 1.0**

### What Changed
- ✅ **Rust backend** (was: Node.js/Express with complex DI)
- ✅ **Simplified architecture** (was: Over-abstracted with Repository/Service/Controller layers)
- ✅ **Direct database access** (was: Repository pattern with multiple abstraction layers)
- ✅ **Simple state management** (was: Complex service layer with notifications/audit)
- ✅ **Single deployment path** (was: Native vs Docker with port conflicts)
- ✅ **Focused feature set** (was: Too many incomplete features)
- ✅ **Clear documentation** (was: Scattered across multiple tools)

### What Stayed
- ✅ **React + TypeScript + Vite** (working well)
- ✅ **TanStack Router** (working well for file-based routing)
- ✅ **shadcn/ui + Tailwind** (modern, accessible UI)
- ✅ **PostgreSQL** (production-ready database)
- ✅ **Security focus** (RBAC with simplified implementation)

## 📋 **What NOT to Do (Critical)**

Based on Janus 1.0 experience, **AVOID**:

❌ **Over-abstraction** - No Repository/Service/Controller layers unless absolutely needed  
❌ **Complex DI** - Use simple dependency injection, not elaborate containers  
❌ **Multiple sync tools** - One source of truth for project management  
❌ **Too many agents** - Maximum 5 specialized agents, not 10+  
❌ **Mock data** - Implement real features or don't implement them  
❌ **Feature creep** - Complete features before adding new ones  
❌ **Incomplete implementations** - No TODO comments in production code  
❌ **Complex deployment** - One clear deployment path, not multiple options  

## 🎯 **Success Criteria**

Janus 2.0 is successful when:

1. ✅ **Backend builds in < 30 seconds** (was: minutes with TypeScript)
2. ✅ **API response time < 50ms** (was: 200ms)
3. ✅ **Zero abstraction layers** between API and database (was: 3-4 layers)
4. ✅ **100% API test coverage** on first implementation
5. ✅ **Single deployment command** (was: multiple scripts and options)
6. ✅ **Complete features only** (no mock data, no TODOs)
7. ✅ **Simple onboarding** (new developer productive in 1 day, not 1 week)

## 🔧 **Development Setup**

### Prerequisites
- **Rust** 1.70+ with Cargo
- **Node.js** 20+ with npm/pnpm
- **PostgreSQL** 15+
- **Docker** (optional, for PostgreSQL)
- **Mac M2** compatible setup

### Quick Setup
```bash
# Clone and setup
git clone <repository>
cd janus-2.0

# Backend setup
cd backend
cargo build
cargo test

# Frontend setup  
cd ../frontend
npm install
npm run dev

# Database setup
docker-compose up -d postgres
cargo run --bin migrate
```

## 📊 **Project Status**

- **Status**: 📝 **SPECIFICATION PHASE**
- **Version**: 2.0.0-alpha
- **Last Updated**: 2025-10-26
- **Phase**: Requirements and Architecture Definition

## 🤝 **Contributing**

This is a complete rewrite. Follow these principles:
1. **Read lessons learned** before implementing
2. **Simple solutions first** - optimize later if needed
3. **Complete features** - no half-implementations
4. **Write tests** - 100% coverage goal
5. **Document decisions** - in code and docs

## 📞 **Support**

- **Documentation**: All docs in this folder
- **Architecture Questions**: See `02-ARCHITECTURE.md`
- **Implementation Questions**: See relevant section docs
- **Migration Questions**: See `10-MIGRATION-STRATEGY.md`

---

**Janus 2.0** - *Secure, Simple, and Fast*

*Built with lessons learned from Janus 1.0*


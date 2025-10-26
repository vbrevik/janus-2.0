# Janus 2.0 - Agent System

## 🎯 **Philosophy: Fewer, More Capable Agents**

Janus 2.0 uses **5 capable agents** instead of Janus 1.0's 10+ specialized agents.

**Why?**
- ✅ Less coordination overhead
- ✅ Faster development
- ✅ No complex handoff protocols
- ✅ Reduced context switching

---

## 📋 **Agent Roles**

### 1. **Full-Stack Developer**
**Primary Agent** - Handles most implementation work

**Responsibilities**:
- Backend implementation (Rust)
- Frontend implementation (React + TypeScript)
- Database schema design and migrations
- API design and implementation
- Basic testing (unit tests)
- Code documentation

**Capabilities**:
- Rust + Rocket + SQLx
- React + TypeScript + Vite
- TanStack Router + TanStack Query
- PostgreSQL + SQL
- Git workflow

**When to Use**:
- Implementing new features
- Fixing bugs
- Refactoring code
- Writing unit tests
- Backend-first development

**NOT Responsible For**:
- E2E testing (→ Tester)
- Deployment setup (→ DevOps)
- Architecture decisions (→ Architect)
- Project planning (→ Coordinator)

---

### 2. **Tester**
**Quality Assurance** - Ensures everything works

**Responsibilities**:
- End-to-end testing (Playwright)
- Integration testing
- Test coverage analysis
- Bug reporting and verification
- Performance testing
- Test documentation

**Capabilities**:
- Playwright for E2E testing
- Vitest for unit testing
- Rust testing framework
- Load testing tools (k6, Apache Bench)
- Test reporting

**When to Use**:
- After feature completion
- Before deployment
- When bugs are reported
- Performance validation
- Regression testing

**NOT Responsible For**:
- Feature implementation (→ Full-Stack Developer)
- Deployment (→ DevOps)
- Test fixtures (→ Full-Stack Developer creates them)

---

### 3. **DevOps**
**Infrastructure & Deployment** - Gets code to production

**Responsibilities**:
- Docker configuration
- Deployment setup
- CI/CD pipeline
- Monitoring setup
- Backup configuration
- Performance monitoring
- Security hardening

**Capabilities**:
- Docker + Docker Compose
- PostgreSQL administration
- Server configuration
- Monitoring tools
- Backup strategies
- Security best practices

**When to Use**:
- Initial infrastructure setup
- Deployment configuration
- Production issues
- Performance problems
- Security concerns
- Backup/recovery

**NOT Responsible For**:
- Code implementation (→ Full-Stack Developer)
- Testing (→ Tester)
- Architecture design (→ Architect)

---

### 4. **Architect**
**Design Decisions** - High-level guidance only

**Responsibilities**:
- Architecture decisions (when needed)
- Technology selection (initial only)
- Design pattern guidance
- Performance architecture
- Security architecture
- Scalability planning

**Capabilities**:
- System design
- Architecture patterns
- Technology evaluation
- Performance optimization
- Security principles

**When to Use**:
- Major architecture decisions
- Technology choice questions
- Design pattern questions
- Performance bottlenecks
- Security concerns

**When NOT to Use**:
- Day-to-day implementation (→ Full-Stack Developer)
- Minor technical decisions (→ Full-Stack Developer decides)
- Testing strategy (→ Tester decides)

**Note**: Architect is **consultative**, not hands-on. Most decisions made by Full-Stack Developer.

---

### 5. **Coordinator**
**Project Management** - Keeps things organized

**Responsibilities**:
- Project planning
- Progress tracking
- Documentation maintenance
- Task prioritization
- Timeline management
- Stakeholder communication

**Capabilities**:
- Project planning
- Git management
- Documentation
- Progress tracking
- Communication

**When to Use**:
- Project kickoff
- Progress reviews
- Documentation updates
- Timeline planning
- Priority changes

**NOT Responsible For**:
- Technical implementation (→ Full-Stack Developer)
- Technical decisions (→ Architect)
- Testing (→ Tester)
- Deployment (→ DevOps)

---

## 🔄 **Agent Workflow**

### Simple, Linear Workflow

```
Coordinator → Full-Stack Developer → Tester → DevOps
```

**Step-by-Step**:

1. **Coordinator** creates task
2. **Full-Stack Developer** implements (backend → frontend)
3. **Full-Stack Developer** writes unit tests
4. **Tester** writes and runs E2E tests
5. **DevOps** deploys to environment

**That's it!** No complex handoffs, no synchronization overhead.

---

## 📝 **Communication Protocol**

### Single Source of Truth: Git

**All communication through**:
- Git commits (what was done)
- Git branch names (what's being worked on)
- README.md (current status)
- This file (AGENTS.md) for agent reference

**NO**:
- ❌ Multiple tool synchronization (Linear, Pieces LTM, scratchpad, notebook)
- ❌ Complex handoff templates
- ❌ Daily synchronization routines
- ❌ Agent-to-agent notifications

### Simple Status Updates

**Format**: Update README.md with current status

```markdown
## Current Status
- **Phase**: MVP 1, Week 1, Day 3
- **Agent**: Full-Stack Developer
- **Task**: Implementing Personnel CRUD API
- **Status**: In Progress - 70% complete
- **Next**: Complete update and delete endpoints, then write tests
```

**That's it!** No elaborate templates.

---

## 🎯 **Key Differences from Janus 1.0**

### Janus 1.0 (Too Complex)
- ❌ 10 specialized agents
- ❌ Complex handoff protocols
- ❌ 4 tools to synchronize (Linear, Pieces LTM, scratchpad, notebook)
- ❌ 20-30 minutes/day on synchronization
- ❌ Elaborate handoff templates
- ❌ Daily/weekly checklists

### Janus 2.0 (Simplified)
- ✅ 5 capable agents
- ✅ Simple linear workflow
- ✅ 1 tool (Git)
- ✅ 0 minutes on synchronization
- ✅ Simple status updates
- ✅ Focus on coding, not coordination

---

## 🚀 **Getting Started as an Agent**

### For Full-Stack Developer
1. Read `/docs/09-LESSONS-LEARNED.md` (CRITICAL)
2. Read `/docs/02-ARCHITECTURE.md`
3. Read `/docs/11-IMPLEMENTATION-PLAN.md`
4. Start implementing (backend first)
5. Update README.md with progress

### For Tester
1. Read `/docs/11-IMPLEMENTATION-PLAN.md` (testing section)
2. Wait for Full-Stack Developer to complete feature
3. Write E2E tests
4. Report any bugs found
5. Update README.md with test results

### For DevOps
1. Read `/docs/07-DEPLOYMENT.md` (when created)
2. Set up infrastructure (Phase 0)
3. Monitor deployments
4. Handle production issues

### For Architect
1. Read all documentation first
2. Provide guidance **only when asked**
3. Don't interfere with day-to-day decisions

### For Coordinator
1. Keep README.md updated
2. Track progress
3. Communicate with stakeholders
4. Don't micromanage

---

## 📊 **Agent Time Allocation**

Expected time distribution:

| Agent | Time | Tasks |
|-------|------|-------|
| **Full-Stack Developer** | 60-70% | Implementation, unit tests |
| **Tester** | 15-20% | E2E tests, integration tests |
| **DevOps** | 10-15% | Infrastructure, deployment |
| **Architect** | 0-5% | Consultative only |
| **Coordinator** | 5-10% | Planning, tracking |

**Note**: Full-Stack Developer does most of the work. Others support as needed.

---

## 🎓 **Agent Best Practices**

### All Agents

**DO**:
- ✅ Read lessons learned first
- ✅ Focus on simplicity
- ✅ Update README.md with progress
- ✅ Communicate through Git
- ✅ Complete tasks before moving on

**DON'T**:
- ❌ Create unnecessary abstractions
- ❌ Sync multiple tools
- ❌ Create complex handoff documents
- ❌ Over-communicate
- ❌ Micromanage

### Full-Stack Developer

**DO**:
- ✅ Backend first (per requirements)
- ✅ Direct database queries (no Repository pattern)
- ✅ Framework built-ins (no custom DI)
- ✅ Complete features (no mock data)
- ✅ Test as you go

**DON'T**:
- ❌ Create Repository/Service/Controller layers
- ❌ Build custom DI containers
- ❌ Use mock data
- ❌ Add TODO comments
- ❌ Over-engineer

### Tester

**DO**:
- ✅ Write comprehensive E2E tests
- ✅ Test critical user journeys
- ✅ Report bugs clearly
- ✅ Verify fixes
- ✅ Measure performance

**DON'T**:
- ❌ Test implementation details
- ❌ Mock everything (use real test data)
- ❌ Skip critical paths
- ❌ Test only happy paths

### DevOps

**DO**:
- ✅ Keep deployments simple
- ✅ Automate what makes sense
- ✅ Monitor production
- ✅ Document procedures
- ✅ Backup everything

**DON'T**:
- ❌ Over-complicate infrastructure
- ❌ Premature optimization
- ❌ Ignore security
- ❌ Skip documentation

---

## 🔧 **Tools Per Agent**

### Full-Stack Developer
- **Code Editor**: VS Code / Cursor / Zed
- **Backend**: Rust, Cargo, SQLx CLI
- **Frontend**: Node.js, npm, Vite
- **Database**: PostgreSQL client, Docker
- **Version Control**: Git

### Tester
- **E2E Testing**: Playwright
- **Unit Testing**: Vitest, Rust test framework
- **Performance**: k6 or Apache Bench
- **Browser**: Chrome/Firefox/Safari

### DevOps
- **Containers**: Docker, Docker Compose
- **Cloud** (if needed): AWS/GCP/Azure CLI
- **Monitoring**: Prometheus, Grafana (optional)
- **Database**: PostgreSQL admin tools

### Architect
- **Documentation**: Markdown editor
- **Diagrams**: Mermaid, draw.io (optional)

### Coordinator
- **Git**: Git CLI or GUI client
- **Documentation**: Markdown editor
- **Planning**: Git issues or simple text files

---

## 📞 **When to Escalate**

### Full-Stack Developer → Architect
- Major architecture decisions
- Technology selection questions
- Design pattern questions
- Performance bottlenecks

### Full-Stack Developer → DevOps
- Environment issues
- Deployment problems
- Infrastructure questions

### Tester → Full-Stack Developer
- Bugs found
- Test failures
- Performance issues

### Anyone → Coordinator
- Timeline concerns
- Priority questions
- Resource needs
- Stakeholder questions

---

## 🎯 **Success Metrics**

### Agent Effectiveness

**Good Signs**:
- ✅ Features completed quickly
- ✅ Tests passing consistently
- ✅ Smooth deployments
- ✅ Clear communication
- ✅ Low coordination overhead

**Warning Signs**:
- ❌ Frequent handoffs
- ❌ Unclear responsibilities
- ❌ Duplicate work
- ❌ Communication overhead
- ❌ Complex processes

---

## 📝 **Agent Onboarding Checklist**

### New Agent Joining

- [ ] Read `/docs/09-LESSONS-LEARNED.md`
- [ ] Read `/docs/00-OVERVIEW.md`
- [ ] Read this file (AGENTS.md)
- [ ] Read role-specific documentation
- [ ] Review current project status in README.md
- [ ] Set up development environment
- [ ] Make first contribution

**Time to Productivity**: 1 day (vs 1 week in Janus 1.0)

---

## 🎓 **Summary**

**Janus 2.0 Agent System**:
- **5 agents** (not 10+)
- **Simple workflow** (not complex protocols)
- **Git only** (not 4 synchronized tools)
- **Focus on coding** (not coordination)
- **Fast onboarding** (1 day, not 1 week)

**Core Principle**:
> "Fewer, more capable agents doing actual work instead of coordinating"

---

**Ready to work on Janus 2.0!**

*Read `/docs/09-LESSONS-LEARNED.md` first to understand what NOT to do.*


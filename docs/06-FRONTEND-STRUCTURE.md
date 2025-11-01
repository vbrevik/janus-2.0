# Janus 2.0 - Frontend Structure & Patterns

## Document Purpose

This document describes the frontend architecture, organization, and development patterns for Janus 2.0.

---

## Architecture Overview

**Tech Stack**:
- **React** 18+ with TypeScript
- **Vite** 5+ - Build tool and dev server
- **TanStack Router** - File-based routing
- **TanStack Query** - Server state management
- **shadcn/ui** + Tailwind CSS - UI components

---

## Directory Structure

```
frontend/
├── src/
│   ├── routes/           # File-based routes (TanStack Router)
│   │   ├── __root.tsx    # Root layout
│   │   ├── login.tsx
│   │   ├── personnel/
│   │   │   ├── index.tsx
│   │   │   └── $personnelId.tsx
│   │   └── ...
│   ├── components/       # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout.tsx    # Main app layout
│   │   └── protected-route.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── use-personnel.ts
│   │   ├── use-vendors.ts
│   │   └── ...
│   ├── contexts/         # React contexts
│   │   └── auth-context.tsx
│   ├── lib/              # Utilities
│   │   ├── api.ts        # API client
│   │   └── utils.ts
│   └── types/            # TypeScript type definitions
│       ├── personnel.ts
│       ├── vendor.ts
│       └── ...
├── public/               # Static assets
├── e2e/                  # Playwright E2E tests
└── package.json
```

---

## Unified Frontend Architecture

Janus 2.0 has a **single unified frontend application** with role-based routing:

**`frontend/`** (Unified) - Port 15510
- **Admin Routes** (`/admin/*`): Full CRUD for administrators
  - All management features
  - Personnel, vendors, access control, audit logs, etc.
- **EndUser Routes** (`/enduser/*`): Task management for end users
  - NDA signing, document references, discussions
- **Official Routes** (`/official/*`): Read-only lookup for official entities
  - Personnel lookup, vendor lookup

**Route Protection**: All routes are protected by role-based guards (`ProtectedRoute` component)
**Shared Backend**: Connects to same backend API (port 15520)

---

## Key Patterns

### 1. File-Based Routing (TanStack Router)

Routes are automatically generated from file structure:
- `src/routes/personnel/index.tsx` → `/personnel`
- `src/routes/personnel/$personnelId.tsx` → `/personnel/:id`

### 2. Server State Management (TanStack Query)

**Query Keys Pattern**:
```typescript
export const personnelKeys = {
  all: ['personnel'] as const,
  lists: () => [...personnelKeys.all, 'list'] as const,
  list: (page: number) => [...personnelKeys.lists(), page] as const,
  detail: (id: number) => [...personnelKeys.all, 'detail', id] as const,
}
```

**Usage**:
```typescript
// Query
const { data, isLoading } = usePersonnelList(page, perPage)

// Mutation
const createMutation = useCreatePersonnel()
await createMutation.mutateAsync({ ...data })
```

### 3. API Client Pattern

**Centralized API Client** (`lib/api.ts`):
- Automatic JWT token injection
- Base URL configuration
- Error handling
- Request/response interceptors

### 4. Component Patterns

**shadcn/ui Components**:
- Consistent design system
- Accessible by default
- Customizable via Tailwind

**Layout Pattern**:
- Root layout wraps all routes
- Protected routes check authentication
- Navigation bar shared across pages

---

## State Management

**No Global State Management Library**:
- ✅ TanStack Query for server state
- ✅ React Context for auth state
- ✅ Local state (useState) for UI state

**Why?**: Simplicity - no need for Redux/Zustand with this architecture

---

## Styling

**Tailwind CSS**:
- Utility-first CSS framework
- Consistent design tokens
- Responsive by default

**shadcn/ui**:
- Copy-paste component library
- Built on Radix UI primitives
- Fully customizable

---

## Testing

**E2E Tests** (Playwright):
- Located in `e2e/` directory
- Test critical user journeys
- Run with `npm run test:e2e`

**Component Tests** (Vitest):
- Unit tests for components
- Testing Library for rendering

---

## Development Workflow

### Adding a New Feature

1. **Backend First**: Implement API endpoints
2. **Types**: Define TypeScript types in `src/types/`
3. **Hooks**: Create TanStack Query hooks in `src/hooks/`
4. **Route**: Create route file in `src/routes/`
5. **Components**: Build UI components using shadcn/ui
6. **E2E Tests**: Add Playwright tests for critical paths

### Running Development Server

```bash
cd frontend
npm run dev
# Server runs on http://localhost:15510
```

---

## Code Organization Principles

1. **Feature-based structure** where possible
2. **Shared components** in `components/ui/`
3. **API logic** centralized in `lib/api.ts`
4. **Type safety** - TypeScript for all code
5. **No prop drilling** - Use Context for shared state

---

## References

- **TanStack Router Docs**: https://tanstack.com/router
- **TanStack Query Docs**: https://tanstack.com/query
- **shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS Docs**: https://tailwindcss.com

---

**Last Updated**: 2025-01-30


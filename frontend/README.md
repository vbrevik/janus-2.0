# Janus 2.0 Frontend

React + TypeScript frontend for Janus 2.0 Security Clearance System.

## Tech Stack

- **React 19** with TypeScript
- **Vite** - Fast build tool
- **TanStack Router** - File-based routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI component library

## Prerequisites

- Node.js 20+
- npm or pnpm

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Start development server**:
```bash
npm run dev
```

The app will be available at http://localhost:15510

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests
- `npm run test:e2e` - Run Playwright E2E tests

### Project Structure

```
frontend/
├── src/
│   ├── routes/           # File-based routes (TanStack Router)
│   │   ├── __root.tsx   # Root layout
│   │   └── index.tsx    # Home page
│   ├── components/      # Reusable components
│   ├── lib/            # Utilities and API client
│   │   └── api.ts      # API client
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript types
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── package.json
```

### Adding Routes

TanStack Router uses file-based routing. To add a new route:

1. Create a file in `src/routes/`
2. Export a route using `createFileRoute`
3. The file path becomes the URL path

Example:
```tsx
// src/routes/about.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return <div>About Page</div>
}
```

### API Integration

Use the API client from `src/lib/api.ts`:

```tsx
import { api } from '@/lib/api'

// GET request
const data = await api.get('/personnel')

// POST request
const result = await api.post('/personnel', { name: 'John Doe' })
```

### Styling

This project uses Tailwind CSS. Add utility classes directly in JSX:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

## Environment Variables

Create a `.env` file:

```
VITE_API_URL=http://localhost:15520/api
```

## Testing

### Unit Tests (Vitest)

```bash
npm test
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e
```

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Port Configuration

- Development: http://localhost:15510
- Backend API: http://localhost:15520

To change the port, update `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    port: 15510, // Your desired port
  },
})
```

## Notes

- TanStack Router auto-generates route types in `src/routeTree.gen.ts`
- This file is git-ignored and regenerated on each build
- Use `@/` alias for absolute imports from `src/`

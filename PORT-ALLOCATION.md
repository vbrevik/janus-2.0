# Janus 2.0 - Port Allocation

## Port Range: 15500-15599

**Strategy**: 10-port spacing between services to allow for future expansion and avoid conflicts.

## Allocated Ports

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| **Frontend** (Unified) | 15510 | React + Vite with role-based routing | ✅ Allocated |
| **Backend API** | 15520 | Rust + Rocket HTTP server | ✅ Allocated |
| **PostgreSQL** | 15530 | PostgreSQL database (mapped from 5432) | ✅ Allocated |
| **WebSocket Server** | 15540 | Real-time messaging WebSocket server | ✅ Active |
| **Reserved** | 15550 | Future service (e.g., Redis cache) | 🔄 Reserved |
| **Reserved** | 15560 | Future service (e.g., Message queue) | 🔄 Reserved |
| **Reserved** | 15570 | Future service | 🔄 Reserved |
| **Reserved** | 15580 | Future service | 🔄 Reserved |
| **Reserved** | 15590 | Future service | 🔄 Reserved |

## Development vs Production

### Development (Native)
When running services natively:
- Frontend: `npm run dev` → http://localhost:15510
  - Admin: `/admin/*` routes
  - EndUser: `/enduser/*` routes
  - Official: `/official/*` routes
- Backend: `cargo run` → http://localhost:15520
- Database: Docker → localhost:15530

### Development (Docker)
When running in Docker:
- Frontend: http://localhost:15510 (mapped from container:3000)
- Backend: http://localhost:15520 (mapped from container:8000)
- Database: localhost:15530 (mapped from container:5432)

### Production
All services run in Docker with same port mappings.

## Configuration Files

### Backend
- **Cargo.toml**: Port configured in main.rs
- **env.example**: `ROCKET_PORT=15520`
- **docker-compose.yml**: `"15520:8000"`

### Frontend (Unified)
- **vite.config.ts**: `server: { port: 15510 }`
- **docker-compose.yml**: `"15510:3000"`
- **Role-based routes**: `/admin/*`, `/enduser/*`, `/official/*`

### Database
- **docker-compose.yml**: `"15530:5432"`
- **Connection String**: `postgresql://janus:password@localhost:15530/janus2`

## Port Verification

Check if ports are in use:
```bash
# Check all Janus 2.0 ports
lsof -i :15510,15520,15530

# Check specific port
lsof -i :15520

# Kill process on port (if needed)
lsof -ti tcp:15520 | xargs kill -9
```

## Why This Range?

1. **Separation from Janus 1.0**: Uses 15000-15099, avoiding conflicts
2. **10-Port Spacing**: Easy to add new services without conflicts
3. **Clear Organization**: Each service has dedicated space for expansion
4. **Future-Proof**: Room for 9+ additional services

## Access URLs

### Development
- **Frontend**: http://localhost:15510
  - Admin: `/admin/dashboard`
  - EndUser: `/enduser/tasks`
  - Official: `/official/dashboard`
- **Backend API**: http://localhost:15520
- **API Health**: http://localhost:15520/api/health
- **PostgreSQL**: postgresql://janus:password@localhost:15530/janus2

### Production (if different domain)
- **Frontend**: https://your-domain.com
- **Backend API**: https://api.your-domain.com
- **Database**: Internal network only

## Firewall Rules

For production deployment, only expose necessary ports:
- ✅ **15510** (Frontend) - Public access (role-based routing)
- ✅ **15520** (Backend API) - Public access
- ❌ **15530** (Database) - Internal only (block external access)

## Notes

- All services use the **15500-15599 range**
- **10-port gaps** between services for expansion
- Database uses **15530** (mapped from standard 5432)
- Container internal ports remain standard (3000, 8000, 5432)
- Host ports are in the 155XX range for organization


# Janus 2.0 - Port Allocation

## Port Range: 15500-15599

**Strategy**: 10-port spacing between services to allow for future expansion and avoid conflicts.

## Allocated Ports

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| **Frontend** (Admin) | 15510 | React + Vite development server | ✅ Allocated |
| **EndUser Frontend** | 15511 | React + Vite (end user tasks) | ✅ Allocated |
| **Official Frontend** | 15513 | React + Vite (read-only lookup) | ✅ Allocated |
| **Backend API** | 15520 | Rust + Rocket HTTP server | ✅ Allocated |
| **PostgreSQL** | 15530 | PostgreSQL database (mapped from 5432) | ✅ Allocated |
| **Reserved** | 15540 | Future service (e.g., WebSocket) | 🔄 Reserved |
| **Reserved** | 15550 | Future service (e.g., Redis cache) | 🔄 Reserved |
| **Reserved** | 15560 | Future service (e.g., Message queue) | 🔄 Reserved |
| **Reserved** | 15570 | Future service | 🔄 Reserved |
| **Reserved** | 15580 | Future service | 🔄 Reserved |
| **Reserved** | 15590 | Future service | 🔄 Reserved |

## Development vs Production

### Development (Native)
When running services natively:
- Frontend (Admin): `npm run dev` → http://localhost:15510
- EndUser Frontend: `npm run dev` → http://localhost:15511
- Official Frontend: `npm run dev` → http://localhost:15513
- Backend: `cargo run` → http://localhost:15520
- Database: Docker → localhost:15530

### Development (Docker)
When running in Docker:
- Frontend (Admin): http://localhost:15510 (mapped from container:3000)
- EndUser Frontend: http://localhost:15511 (mapped from container:3000)
- Official Frontend: http://localhost:15513 (mapped from container:3000)
- Backend: http://localhost:15520 (mapped from container:8000)
- Database: localhost:15530 (mapped from container:5432)

### Production
All services run in Docker with same port mappings.

## Configuration Files

### Backend
- **Cargo.toml**: Port configured in main.rs
- **env.example**: `ROCKET_PORT=15520`
- **docker-compose.yml**: `"15520:8000"`

### Frontend (Admin)
- **vite.config.ts**: `server: { port: 15510 }`
- **docker-compose.yml**: `"15510:3000"`

### EndUser Frontend
- **vite.config.ts**: `server: { port: 15511 }`
- **docker-compose.yml**: `"15511:3000"`

### Official Frontend
- **vite.config.ts**: `server: { port: 15513 }`
- **docker-compose.yml**: `"15513:3000"`

### Database
- **docker-compose.yml**: `"15530:5432"`
- **Connection String**: `postgresql://janus:password@localhost:15530/janus2`

## Port Verification

Check if ports are in use:
```bash
# Check all Janus 2.0 ports
lsof -i :15510,15511,15513,15520,15530

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
- **Frontend (Admin)**: http://localhost:15510
- **EndUser Frontend**: http://localhost:15511
- **Official Frontend**: http://localhost:15513
- **Backend API**: http://localhost:15520
- **API Health**: http://localhost:15520/api/health
- **PostgreSQL**: postgresql://janus:password@localhost:15530/janus2

### Production (if different domain)
- **Frontend**: https://your-domain.com
- **Backend API**: https://api.your-domain.com
- **Database**: Internal network only

## Firewall Rules

For production deployment, only expose necessary ports:
- ✅ **15510** (Frontend Admin) - Public access
- ✅ **15511** (EndUser Frontend) - Public access
- ✅ **15513** (Official Frontend) - Public access
- ✅ **15520** (Backend API) - Public access
- ❌ **15530** (Database) - Internal only (block external access)

## Notes

- All services use the **15500-15599 range**
- **10-port gaps** between services for expansion
- Database uses **15530** (mapped from standard 5432)
- Container internal ports remain standard (3000, 8000, 5432)
- Host ports are in the 155XX range for organization


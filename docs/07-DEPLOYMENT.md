# Janus 2.0 - Deployment Guide

## Document Purpose

This document provides deployment instructions and strategies for Janus 2.0.

---

## Deployment Strategy

### Single-Command Deployment

Janus 2.0 uses **Docker Compose** for deployment:

```bash
docker-compose up -d
```

This starts all services:
- PostgreSQL database
- Backend API (Rust/Rocket)
- Frontend (Admin, End-User, Official)

---

## Prerequisites

- **Docker** 24+ and Docker Compose
- **Mac M2** compatible images (or your platform)
- **Environment variables** configured

---

## Environment Configuration

### Backend Environment (`.env`)

```bash
DATABASE_URL=postgresql://janus:janus_dev_password@postgres:5432/janus2
JWT_SECRET=your-secret-key-change-in-production
RUST_LOG=info
PORT=15520
```

### Frontend Environment

Frontend uses environment variables for API base URL:
- `VITE_API_URL=http://localhost:15520`

---

## Docker Services

### PostgreSQL
- **Image**: `postgres:15-alpine`
- **Port**: 15530 (host) → 5432 (container)
- **Database**: `janus2`
- **User**: `janus`
- **Password**: Set in environment

### Backend
- **Port**: 15520
- **Build**: Rust release build
- **Health Check**: `GET /api/health`

### Frontend (Admin)
- **Port**: 15510
- **Build**: Vite production build
- **Served**: Nginx

### Frontend (End-User)
- **Port**: 15514
- **Build**: Vite production build
- **Served**: Nginx

### Frontend (Official)
- **Port**: 15515
- **Build**: Vite production build
- **Served**: Nginx

---

## Deployment Steps

### 1. Development Deployment

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend sqlx migrate run

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 2. Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend sqlx migrate run

# Verify health
curl http://localhost:15520/api/health
```

---

## Database Migrations

Migrations are handled via SQLx CLI:

```bash
# In backend container
sqlx migrate run

# Or via docker-compose
docker-compose exec backend sqlx migrate run
```

**Migration files**: `backend/migrations/*.sql`

---

## Health Checks

**Backend Health**:
```bash
curl http://localhost:15520/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "port": 15520,
  "database": "connected"
}
```

---

## Monitoring

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Database

```bash
# Connect to database
docker-compose exec postgres psql -U janus -d janus2
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U janus janus2 > backup.sql

# Restore
docker-compose exec -T postgres psql -U janus janus2 < backup.sql
```

### Automated Backups

Set up cron job or scheduled task for daily backups.

---

## Security Considerations

1. **Change default passwords** in production
2. **Use strong JWT secret** (minimum 32 characters)
3. **Enable HTTPS** in production (reverse proxy)
4. **Restrict database access** to backend only
5. **Regular security updates** for dependencies

---

## Port Allocation

See [PORT-ALLOCATION.md](../PORT-ALLOCATION.md) for complete port documentation.

**Key Ports**:
- Backend: 15520
- Admin Frontend: 15510
- End-User Frontend: 15514
- Official Frontend: 15515
- PostgreSQL: 15530

---

## Troubleshooting

### Services Won't Start
- Check port conflicts: `lsof -i :15520`
- Check Docker: `docker ps`
- Check logs: `docker-compose logs`

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `docker-compose ps postgres`
- Verify network connectivity

### Migration Errors
- Check database schema: `sqlx migrate info`
- Verify migration files are correct
- Check database permissions

---

**Last Updated**: 2025-01-30  
**Deployment Method**: Docker Compose  
**Single Command**: `docker-compose up -d`


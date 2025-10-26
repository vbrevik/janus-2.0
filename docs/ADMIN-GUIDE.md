# Janus 2.0 - Administrator Guide

## System Overview

Janus 2.0 is a security clearance management system running on:
- **Frontend**: React (Port 15510)
- **Backend**: Rust/Rocket (Port 15520)
- **Database**: PostgreSQL (Port 15530)

---

## Initial Setup

### 1. Starting the System

```bash
# Start database
docker-compose -f docker-compose.dev.yml up -d

# Start backend
cd backend
export DATABASE_URL="postgresql://janus:janus_dev_password@localhost:15530/janus2"
export JWT_SECRET="your-production-secret-here"
./target/release/janus-backend &

# Start frontend
cd frontend
npm run dev
```

### 2. Access the System

- Frontend: http://localhost:15510
- Backend API: http://localhost:15520
- Database: localhost:15530

### 3. Default Credentials

**IMPORTANT**: Change these in production!

- Username: `admin`
- Password: `password123`

---

## User Management

### Creating Users

Connect to PostgreSQL and insert users:

```sql
INSERT INTO users (username, password_hash, role)
VALUES ('newuser', 'bcrypt_hashed_password', 'operator');
```

**Roles Available**:
- `admin` - Full system access
- `manager` - Personnel and vendor management
- `operator` - Read-only access to most features
- `viewer` - View only access

### Changing Passwords

Generate bcrypt hash and update:

```sql
UPDATE users SET password_hash = 'new_bcrypt_hash' WHERE username = 'username';
```

---

## Database Management

### Backup

```bash
pg_dump -h localhost -p 15530 -U janus janus2 > backup.sql
```

### Restore

```bash
psql -h localhost -p 15530 -U janus janus2 < backup.sql
```

### Migrations

```bash
cd backend
sqlx migrate run
```

---

## Configuration

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://janus:janus_dev_password@localhost:15530/janus2
JWT_SECRET=your-production-secret
ROCKET_PORT=15520
ROCKET_ADDRESS=0.0.0.0
RUST_LOG=info
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:15520/api
```

---

## Security

### Production Deployment

1. **Change default passwords**
2. **Use strong JWT_SECRET** (32+ characters)
3. **Restrict CORS** to production frontend URL only
4. **Enable HTTPS** with SSL certificates
5. **Regular backups** (daily recommended)
6. **Audit log monitoring** for suspicious activity

### Security Measures

- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT authentication (8-hour expiration)
- ✅ SQL injection prevention (SQLx)
- ✅ Input validation (validator crate)
- ✅ Soft delete for audit trails
- ✅ Role-based access control

---

## Monitoring

### Health Check

```bash
curl http://localhost:15520/api/health
```

### Audit Logs

Query recent activity:

```sql
SELECT * FROM audit_log 
ORDER BY created_at DESC 
LIMIT 100;
```

### System Status

All services running:
- Database: `docker ps` shows janus2-postgres-dev
- Backend: `curl http://localhost:15520/api/health`
- Frontend: `curl http://localhost:15510`

---

## Troubleshooting

### Backend Not Starting

1. Check port 15520 not in use: `lsof -i :15520`
2. Check database connection: `psql $DATABASE_URL`
3. Check logs: `./target/release/janus-backend` output

### Frontend Not Loading

1. Check port 15510 not in use: `lsof -i :15510`
2. Check backend responding: `curl http://localhost:15520/api/health`
3. Check browser console for errors

### Database Issues

1. Check PostgreSQL running: `docker ps`
2. Check connections: `psql $DATABASE_URL`
3. Run migrations: `sqlx migrate run`

---

## Performance

### Current Performance

- API Response: < 5ms average
- Health Check: 0.8ms
- Personnel List: 2.7ms
- Vendor List: 4.5ms

### Load Capacity

- Tested: 100 concurrent users
- Capacity: 500+ concurrent users (estimated)
- Database connections: Max 10 pool

---

## Backup & Recovery

### Daily Backups

```bash
# Create backup script
cat > /path/to/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump -h localhost -p 15530 -U janus janus2 > /backups/janus2_$DATE.sql
find /backups -name "janus2_*.sql" -mtime +7 -delete
EOF

chmod +x /path/to/backup.sh

# Add to crontab (daily at 2 AM)
# 0 2 * * * /path/to/backup.sh
```

### Recovery Process

```bash
# Stop services
docker-compose down

# Restore database
psql -h localhost -p 15530 -U janus janus2 < backup.sql

# Restart services
docker-compose up -d
```

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review audit logs
- Check disk space
- Verify backups

**Monthly**:
- Review user accounts
- Audit access permissions
- Update documentation

**Quarterly**:
- Security review
- Performance optimization
- System updates

---

## Support

For technical support:
1. Check documentation in `/docs`
2. Review logs: `backend/target/release/janus-backend.log`
3. Contact system architect
4. Check GitHub issues: [repository URL]

---

**Version**: 2.0.0  
**Last Updated**: October 26, 2025


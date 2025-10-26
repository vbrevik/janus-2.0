# Janus 2.0 Backend

Rust backend API for Janus 2.0 Security Clearance System.

## Prerequisites

- Rust 1.70+
- PostgreSQL 15+ (or Docker)
- SQLx CLI: `cargo install sqlx-cli --features postgres`

## Setup

1. **Copy environment file**:
```bash
cp env.example .env
# Edit .env with your configuration
```

2. **Start PostgreSQL**:
```bash
docker-compose up -d postgres
```

3. **Run migrations**:
```bash
sqlx database create
sqlx migrate run
```

4. **Build and run**:
```bash
cargo build
cargo test
cargo run
```

## Development

### Running tests
```bash
cargo test
```

### Running with auto-reload
```bash
cargo watch -x run
```

### Creating migrations
```bash
sqlx migrate add <migration_name>
```

## API Endpoints

### Health Check
```bash
curl http://localhost:15520/api/health
```

## Project Structure

```
backend/
├── src/
│   ├── main.rs           # Application entry point
│   ├── auth/             # Authentication module
│   ├── personnel/        # Personnel management
│   ├── vendors/          # Vendor management
│   ├── access/           # Access control
│   ├── audit/            # Audit logging
│   └── shared/           # Shared utilities
├── migrations/           # Database migrations
├── tests/               # Integration tests
└── Cargo.toml           # Dependencies
```

## Environment Variables

See `env.example` for all available configuration options.

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 characters)

### Optional
- `ROCKET_PORT` - API server port (default: 15520)
- `ROCKET_ADDRESS` - Bind address (default: 0.0.0.0)
- `RUST_LOG` - Logging level (default: info)

## Database

The application uses PostgreSQL with SQLx for compile-time checked queries.

### Connection String Format
```
postgresql://username:password@host:port/database
```

### Development
```
postgresql://janus:janus_dev_password@localhost:15530/janus2
```

## Performance Targets

- Build time: < 30 seconds
- API response: < 50ms (p95)
- Test coverage: 80%+

## Notes

- Port 15520 is used for the backend API
- All queries use SQLx for compile-time verification
- No Repository/Service pattern - direct database queries in handlers
- Feature-based module organization


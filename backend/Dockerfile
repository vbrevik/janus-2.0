# Build stage
# Using a newer toolchain to support Cargo.lock v4
FROM rust:1.87-slim as builder

# Install required dependencies for compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Provide database URL so SQLx macros can compile during build
ENV DATABASE_URL=postgresql://janus:janus_dev_password@host.docker.internal:15530/janus2

# Pre-fetch dependencies for caching
RUN cargo fetch

# Copy source code
COPY src ./src
COPY migrations ./migrations

# Build for release
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/janus-backend /app/janus-backend

# Copy migrations
COPY --from=builder /app/migrations /app/migrations

# Expose port
EXPOSE 8000

# Run the binary
CMD ["/app/janus-backend"]


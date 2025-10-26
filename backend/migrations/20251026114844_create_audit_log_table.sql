-- Create audit_log table for tracking all system changes
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_GRANT', 'ACCESS_REVOKE')),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('USER', 'PERSONNEL', 'VENDOR', 'ACCESS', 'SYSTEM')),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_username ON audit_log(username);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Create composite index for common query patterns
CREATE INDEX idx_audit_log_user_resource ON audit_log(user_id, resource_type, created_at DESC);

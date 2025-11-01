-- Create discussions table for end-user to admin communication
CREATE TABLE IF NOT EXISTS discussions (
    id SERIAL PRIMARY KEY,
    personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'discussion' CHECK (type IN ('discussion', 'report', 'request')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create discussion_replies table for conversation threads
CREATE TABLE IF NOT EXISTS discussion_replies (
    id SERIAL PRIMARY KEY,
    discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_discussions_personnel ON discussions(personnel_id);
CREATE INDEX idx_discussions_status ON discussions(status);
CREATE INDEX idx_discussions_type ON discussions(type);
CREATE INDEX idx_discussions_assigned_to ON discussions(assigned_to);
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX idx_discussion_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX idx_discussion_replies_created_at ON discussion_replies(created_at DESC);

-- Create triggers to update updated_at
CREATE TRIGGER update_discussions_updated_at
    BEFORE UPDATE ON discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_replies_updated_at
    BEFORE UPDATE ON discussion_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE discussions IS 'Discussions, reports, and requests from end users to admin';
COMMENT ON COLUMN discussions.type IS 'Type: discussion (general), report (information sharing), request (asking for something)';
COMMENT ON COLUMN discussions.status IS 'Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED';






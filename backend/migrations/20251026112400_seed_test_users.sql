-- Seed test users with different roles
-- All passwords are: password123
-- bcrypt hash with cost 12: $2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2

-- Admin user (password: password123)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2', 'admin');

-- Manager user (password: password123)
INSERT INTO users (username, password_hash, role) VALUES
('manager', '$2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2', 'manager');

-- Operator user (password: password123)
INSERT INTO users (username, password_hash, role) VALUES
('operator', '$2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2', 'operator');

-- Viewer user (password: password123)
INSERT INTO users (username, password_hash, role) VALUES
('viewer', '$2b$12$AGJy4fF9OGK19yHRCxG2Mu/Ju4E5i1RXnm.KYu.Oq3QUdf9vWOVG2', 'viewer');

-- Add some sample personnel records
INSERT INTO personnel (first_name, last_name, email, phone, clearance_level, department, position) VALUES
('John', 'Doe', 'john.doe@example.com', '555-0101', 'SECRET', 'Engineering', 'Senior Engineer'),
('Jane', 'Smith', 'jane.smith@example.com', '555-0102', 'TOP_SECRET', 'Security', 'Security Officer'),
('Bob', 'Johnson', 'bob.johnson@example.com', '555-0103', 'CONFIDENTIAL', 'Operations', 'Operations Manager');

-- Add some sample vendor records
INSERT INTO vendors (company_name, contact_name, contact_email, contact_phone, clearance_level, contract_number) VALUES
('SecureTech Solutions', 'Alice Williams', 'alice@securetech.com', '555-0201', 'SECRET', 'CONTRACT-2024-001'),
('DataGuard Inc', 'Charlie Brown', 'charlie@dataguard.com', '555-0202', 'CONFIDENTIAL', 'CONTRACT-2024-002');


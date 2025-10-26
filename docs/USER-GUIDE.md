# Janus 2.0 - User Guide

## Getting Started

### 1. Accessing the System

1. Open your web browser
2. Navigate to: `http://localhost:15510`
3. You will be redirected to the login page

### 2. Logging In

**Default Credentials** (for development):
- Username: `admin`
- Password: `password123`

**Note**: These credentials should be changed in production.

### 3. Navigating the Interface

After logging in, you'll see the main navigation:

- **Personnel** - Manage personnel records
- **Vendors** - Manage vendor organizations
- **Access Control** - Grant/revoke access permissions
- **Audit Logs** - View system activity logs
- **Logout** - Sign out of the system

---

## Managing Personnel

### Viewing Personnel

1. Click **Personnel** in the navigation
2. You'll see a table with all personnel records
3. Use pagination to navigate through pages

### Creating Personnel

1. Click **Add Personnel** button
2. Fill in the form:
   - First Name (required)
   - Last Name (required)
   - Email (required, unique)
   - Phone (optional)
   - Clearance Level (required)
   - Department (required)
   - Position (required)
3. Click **Create**
4. The new personnel record will appear in the table

### Editing Personnel

1. Find the person in the table
2. Click the **Edit** button (pencil icon)
3. Modify the information
4. Click **Save Changes**

### Deleting Personnel

1. Find the person in the table
2. Click the **Delete** button (trash icon)
3. Confirm the deletion
4. The record will be soft-deleted (hidden but recoverable)

---

## Managing Vendors

### Viewing Vendors

1. Click **Vendors** in the navigation
2. You'll see a table with all vendor organizations

### Creating Vendors

1. Click **Add Vendor** button
2. Fill in the form:
   - Company Name (required)
   - Contact Name (required)
   - Contact Email (required, unique)
   - Contact Phone (optional)
   - Clearance Level (required)
   - Contract Number (required, unique)
3. Click **Create**

### Editing Vendors

1. Find the vendor in the table
2. Click **Edit** button
2. Modify the information
3. Click **Save Changes**

### Deleting Vendors

1. Find the vendor in the table
2. Click **Delete** button
3. Confirm the deletion

---

## Access Control

### Granting Computer Access

1. Navigate to **Access Control**
2. Enter the Personnel ID
3. Click **Grant Computer Access**
4. Fill in:
   - System Name
   - Access Level (READ, WRITE, or ADMIN)
   - Expiration Date (optional)
5. Click **Grant Access**

### Granting Data Access

1. Navigate to **Access Control**
2. Enter the Personnel ID
3. Click **Grant Data Access**
4. Fill in:
   - Data Classification (UNCLASSIFIED to TOP_SECRET)
   - Access Level (READ, WRITE, or DELETE)
   - Expiration Date (optional)
5. Click **Grant Access**

### Granting Physical Access

1. Navigate to **Access Control**
2. Enter the Personnel ID
3. Click **Grant Physical Access**
4. Fill in:
   - Zone Name
   - Access Level (VISITOR, STANDARD, RESTRICTED, or FULL)
   - Valid Until Date (optional)
5. Click **Grant Access**

### Viewing Access for Personnel

1. Navigate to **Access Control**
2. Enter the Personnel ID
3. View all granted access (computer, data, physical)

### Revoking Access

Contact your system administrator to revoke access.

---

## Understanding Clearance Levels

**UNCLASSIFIED** - Public information
**CONFIDENTIAL** - Information that could cause damage
**SECRET** - Information that could cause serious damage
**TOP_SECRET** - Information that could cause exceptionally grave damage

---

## Getting Help

For questions or issues:
1. Check this user guide
2. Contact your system administrator
3. Review audit logs for recent activity

---

## Best Practices

1. **Always log out** when finished
2. **Keep credentials secure** - never share passwords
3. **Update information regularly** - keep personnel records current
4. **Verify clearance levels** before granting access
5. **Document access grants** - use expiration dates

---

**Version**: 2.0.0  
**Last Updated**: October 26, 2025


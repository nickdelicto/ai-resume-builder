# Admin Guide

This document provides information on administrative functions available in the Resume Builder application.

## Setup

1. Set the `ADMIN_EMAIL` environment variable in your `.env.local` file:
   ```
   ADMIN_EMAIL=your-admin-email@example.com
   ```
   Replace `your-admin-email@example.com` with the actual email address of the admin user.

2. The admin user must be authenticated with this email address to access admin functionality.

## Admin Tools

### Resume Cleanup Tool

The Resume Cleanup Tool helps manage duplicate resumes in the database. This is especially useful after fixing synchronization issues that may have created multiple copies of the same resume.

**Access**: `/admin/cleanup`

**Features**:

- **Dry Run Mode**: Preview what would be deleted without actually removing any data
- **Max Resumes to Keep**: For each unique resume title per user, keep the specified number of most recent versions
- **User Filtering**: Optionally limit cleanup to a specific user
- **Detailed Statistics**: View counts of total resumes, unique titles, resumes to keep, and resumes to delete

**Usage**:

1. Log in with an admin account (must match the `ADMIN_EMAIL` environment variable)
2. Navigate to your profile page
3. Scroll down to the Admin Tools section
4. Click "Open Cleanup Tool"
5. Configure cleanup options:
   - We recommend starting with "Dry Run" enabled
   - Set "Max Resumes to Keep" (default: 1)
   - Optionally enter a specific User ID
6. Click "Run Dry Run Analysis"
7. Review the results
8. If satisfied, uncheck "Dry Run" and click "Clean Up Duplicates"
9. Confirm the deletion when prompted

**Safety Features**:

- Dry run mode allows previewing changes before making them
- Confirmation dialog for actual deletions
- Process runs in batches to avoid database timeouts with large datasets
- Admin-only access

## Troubleshooting

If you encounter issues with admin access:

1. Verify that your email matches exactly what's in the `ADMIN_EMAIL` environment variable
2. Check server logs for any errors related to admin authentication
3. Ensure you're properly signed in
4. Try clearing cookies and signing in again 
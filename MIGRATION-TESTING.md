# Testing the Resume Data Migration

This document outlines how to test the localStorage to database migration functionality for the Resume Builder.

## What We're Testing

We've implemented a migration process that automatically transfers resume data from localStorage to the database when a user authenticates. This ensures that:

1. Guest users' resume data is preserved when they sign in
2. We begin the transition to using the database as the single source of truth for authenticated users

## Test Procedure

### Prerequisite Setup

1. Ensure your database is running and properly configured
2. Clear your browser's localStorage for the resume builder site
   - Open DevTools (F12)
   - Go to Application > Storage > Local Storage
   - Clear the localStorage for your domain

### Test Case 1: Guest User Data Migration

1. **Create a resume as a guest user**
   - Open the resume builder in an incognito/private window
   - Add some basic information (name, contact info, experience, etc.)
   - Verify data is saved to localStorage:
     - Check DevTools > Application > Storage > Local Storage
     - Look for `modern_resume_data` key

2. **Sign in to an account**
   - Click the "Sign In" button
   - Complete the authentication process
   - You should see a toast notification: "Syncing your resume data..."
   - Followed by: "Your resume data has been synced successfully!"

3. **Verify the migration**
   - Check the console for logs that start with "📊 Migrating..."
   - The resume data should still be visible in the UI
   - The localStorage should still contain the `current_resume_id` key
   - The database should now contain a new resume entry with your data

### Test Case 2: Existing User with New Data

1. **Sign out of your account**
2. **Clear the database record** (optional, for thorough testing)
   - Delete the resume from your database admin panel
3. **Create a new resume as a guest**
4. **Sign in again and verify migration**

### Test Case 3: Edge Cases

1. **Test with partially completed resume**
   - Fill out only some sections before signing in
2. **Test with template selection**
   - Choose a different template before signing in
   - Verify the template selection is preserved
3. **Test with section reordering**
   - Reorder some sections before signing in
   - Verify the order is preserved

## Troubleshooting

If migration fails, check:

1. Console errors during the migration process
2. Network tab in DevTools for failed API requests
3. Verify the `needs_db_migration` flag is set in localStorage
4. Check database logs for any errors during the save operation

## Expected Migration Logs

Look for these log patterns in the console:

```
📊 Marked localStorage data for migration to database
📊 Migrating localStorage data to database after authentication
📊 Migration successful, resumeId: [some-id]
```

If you see `📊 Migration failed`, check the error details in the console. 
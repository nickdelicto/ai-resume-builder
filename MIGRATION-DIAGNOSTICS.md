# Migration Diagnostics

This document explains how to diagnose and fix issues with the localStorage to database migration process.

## Background

When a user signs in, the application should migrate any resume data from localStorage to the database. This migration process is critical for ensuring that users don't lose their work when they sign in.

## Diagnostic Tools

We've added several diagnostic tools to help identify and fix migration issues:

### 1. Enhanced Logging

We've added detailed logging to the following components:

- `lib/resumeUtils.js`: The `migrateToDatabase` function now logs detailed information about the migration process and stores logs in localStorage.
- `lib/services/DbResumeService.js`: The `isAvailable` and `initialize` methods now log more detailed information.
- `lib/services/ResumeServiceFactory.js`: The `getService` method now logs more detailed information.
- `components/ModernResumeBuilder/ModernResumeBuilder.jsx`: The migration useEffect now includes more context information.

### 2. Diagnostic Page

We've created a diagnostic page at `/test-migration` that shows:

- Current localStorage data related to migration
- Migration logs stored in localStorage
- Last migration result
- Authentication status
- Factory test results

### 3. Test Script

We've created a test script at `scripts/test-db-service.js` that can be run directly on the VPS to test the DB service without a browser.

## How to Test

### Method 1: Using the Test Migration Page

1. Go to `/test-migration` on your site
2. Sign out if you're currently signed in
3. Click "Clear Migration Data" to reset migration state
4. Click "Set Migration Flags" to prepare for migration
5. Create a resume in localStorage (go to `/new-resume-builder` and add some data)
6. Sign in to trigger the migration
7. Return to `/test-migration` to see the migration results

### Method 2: Using the Test Script

1. SSH into your VPS
2. Navigate to the project directory
3. Run `node scripts/test-db-service.js`
4. Check the output for any errors or issues

## Common Issues and Solutions

### Issue 1: "Not in browser environment" Error

This happens when the migration function is called in a server-side context. The migration should only run on the client side.

**Solution:** Ensure that the migration function is only called in useEffect hooks or other client-side code.

### Issue 2: "DB service not available" Error

This happens when the DB service's `isAvailable` method returns false. This could be because:

1. The user is not authenticated
2. The browser environment is not properly detected

**Solution:** Check the logs to see why `isAvailable` is returning false. If the user is authenticated but the service is still not available, there might be an issue with the browser environment detection.

### Issue 3: Migration Not Triggered

This happens when the migration process is not triggered when a user signs in.

**Solution:** Check if the `needs_db_migration` flag is set in localStorage. If not, set it manually using the test page.

## Fixing the Issue on Production

After identifying the issue, you can fix it by:

1. Updating the code based on the diagnostic results
2. Pushing the changes to the VPS
3. Restarting the application with `pm2 restart intelliresume`

## Resetting Migration State

If you need to reset the migration state for a user:

1. Go to `/test-migration`
2. Click "Clear Migration Data"
3. Sign out and sign back in

This will trigger a fresh migration attempt. 
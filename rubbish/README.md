# Demo Users Creation Script

This directory contains the script for automatically creating demo users in Clerk with proper role hierarchy mapping for the Mend application.

## Overview

The `create-demo-users.js` script creates 9 demo users with different role levels, from Super Admin (highest privileges) to Public (lowest privileges). Each user is configured with appropriate metadata for role-based access control (RBAC).

## Demo Users Created

| Email | Role | Level | Description |
|-------|------|--------|-------------|
| `role1@scratchie.com` | Mend Super Admin | 1 | Full system access - highest privilege level |
| `role2@scratchie.com` | Mend Account Manager | 2 | Manage accounts and client relationships |
| `role3@scratchie.com` | Administrator | 3 | Administrative access with data management capabilities |
| `role4@scratchie.com` | Mend Analyst | 4 | Analytics and reporting access |
| `role5@scratchie.com` | Builder Admin | 5 | Builder organization administration |
| `role6@scratchie.com` | Site Admin | 6 | Site-level administration and management |
| `role7@scratchie.com` | Client | 7 | Client access to assigned resources |
| `role8@scratchie.com` | Vendor | 8 | Vendor access to relevant data |
| `role9@scratchie.com` | Public | 9 | Public/read-only access - lowest privilege level |

**Default Password for all accounts:** `DemoUser123!`

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file contains the Clerk secret key:
   ```
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   ```

2. **Dependencies**: The script requires Node.js and the `dotenv` package (automatically installed).

3. **Clerk Account**: You must have a Clerk account with a configured application.

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run create-demo-users
```

### Option 2: Direct execution
```bash
node scripts/create-demo-users.js
```

### Option 3: Make executable and run
```bash
chmod +x scripts/create-demo-users.js
./scripts/create-demo-users.js
```

## Features

### Idempotent Operation
- **Safe to run multiple times**: The script checks if users already exist
- **Updates existing users**: If a user exists, it updates their metadata
- **Creates missing users**: Only creates users that don't exist

### Comprehensive Metadata
Each user is created with detailed metadata:

**Public Metadata:**
- `role_id`: Numeric role identifier (1-9)
- `role_name`: String role name (e.g., "mend_super_admin")
- `role_label`: Human-readable role label (e.g., "Mend Super Admin")
- `hierarchy_level`: Privilege level (1=highest, 9=lowest)
- `description`: Role description and capabilities
- `created_by`/`updated_by`: Script attribution
- Timestamps for creation/updates

**Private Metadata:**
- `demo_account`: Flag indicating this is a demo account
- `role_permissions`: Object containing calculated permissions:
  - `can_manage_users`: Boolean based on hierarchy level
  - `can_view_analytics`: Boolean based on role capabilities
  - `can_manage_sites`: Boolean for site management access
  - `is_mend_staff`: Boolean for Mend organization membership
  - `is_admin`: Boolean for administrative privileges

### Error Handling
- **API Error Recovery**: Handles Clerk API errors gracefully
- **Rate Limiting**: Includes delays to avoid API rate limits
- **Detailed Logging**: Provides progress updates and error details
- **Summary Report**: Shows results of create/update operations

## Script Output

The script provides detailed output including:

1. **Progress Updates**: Real-time status for each user
2. **Results Summary**: Count of created, updated, and failed operations
3. **User Credentials**: Complete list of demo accounts and passwords
4. **Role Hierarchy**: Explanation of privilege levels
5. **Error Details**: Specific error messages for any failures

### Sample Output
```
🚀 Starting demo user creation process...

Processing role1@scratchie.com (Mend Super Admin)...
  ✓ Creating new user...
  ✅ Created successfully (ID: user_abc123)

Processing role2@scratchie.com (Mend Account Manager)...
  ✓ User exists, updating metadata...
  ✅ Updated successfully

📊 RESULTS SUMMARY
==================

✅ Created 8 new users:
   • role1@scratchie.com (Mend Super Admin) - ID: user_abc123
   ...

🔄 Updated 1 existing users:
   • role2@scratchie.com (Mend Account Manager) - ID: user_def456

🎯 Total processed: 9/9
🎉 All demo users processed successfully!

🔑 DEMO USER CREDENTIALS
=========================
Password for all accounts: DemoUser123!
...
```

## Integration with Application

### Role-Based Access Control
The created users integrate seamlessly with the application's RBAC system defined in `/src/lib/auth/roles.ts`:

- **Role Constants**: Match the `ROLES` object exactly
- **Permission Functions**: Work with `isSuperAdmin()`, `isAdmin()`, etc.
- **Hierarchy Checks**: Support privilege level comparisons
- **Access Control**: Enable proper route and feature protection

### Authentication Flow
Users can immediately log in using:
1. **Email**: Any of the `role[1-9]@scratchie.com` addresses
2. **Password**: `DemoUser123!`
3. **Metadata**: Automatically populated for role checking

### Testing Scenarios
Use different demo accounts to test:
- **Super Admin Features**: Full system access with role1@scratchie.com
- **Administrative Functions**: Various admin levels with role2-6@scratchie.com
- **Client Access**: Limited access with role7@scratchie.com
- **Vendor Integration**: Vendor-specific features with role8@scratchie.com
- **Public Features**: Read-only access with role9@scratchie.com

## Security Considerations

1. **Demo Account Flag**: All accounts are marked as demo accounts in private metadata
2. **Default Password**: Consider changing the default password in production environments
3. **Environment Protection**: Never run this script against production Clerk instances
4. **Access Cleanup**: Remove demo accounts before production deployment

## Troubleshooting

### Common Issues

**"CLERK_SECRET_KEY environment variable is required"**
- Ensure your `.env` file contains the correct Clerk secret key
- Verify the key starts with `sk_test_` for test environments

**"Clerk API error (401): Unauthorized"**
- Check that your Clerk secret key is valid and active
- Verify you're using the correct key for your Clerk application

**"Phone number validation failed" or "phone_number must be a valid phone number"**
- Your Clerk instance is configured to require phone numbers
- **Solution**: Disable phone number requirements in Clerk Dashboard:
  1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
  2. Select your application
  3. Navigate to **User & Authentication > Settings**
  4. Under **Contact information** section, uncheck **"Phone number is required"**
  5. Save settings and re-run the script

**"User creation failed"**
- Check Clerk dashboard for any user limit restrictions
- Verify your Clerk application settings allow user creation

**Rate limiting errors**
- The script includes delays, but you can increase them if needed
- Check your Clerk plan's API rate limits

### Getting Help

1. Check the Clerk dashboard for detailed error messages
2. Verify your Clerk application configuration
3. Ensure all environment variables are correctly set
4. Review the script output for specific error details

## Development

### Modifying the Script

To customize the demo users:

1. **Change Roles**: Edit the `ROLE_HIERARCHY` array
2. **Update Emails**: Modify the email pattern in the main loop
3. **Adjust Password**: Change the `DEFAULT_PASSWORD` constant
4. **Add Metadata**: Extend the user creation objects

### Testing Changes

Run the script with verbose logging to debug issues:
```bash
DEBUG=true node scripts/create-demo-users.js
```

## Related Files

- `/src/lib/auth/roles.ts` - Role definitions and permission functions
- `/src/components/auth/` - Authentication components that use these roles
- `/.env` - Environment configuration with Clerk keys
- `/package.json` - NPM script configuration
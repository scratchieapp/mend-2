#!/usr/bin/env node

/**
 * Create Production Demo Users Script for Clerk
 * This script creates 9 demo users in PRODUCTION Clerk
 */

import { Clerk } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Clerk with PRODUCTION secret key
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

console.log('🔐 Using Clerk Secret Key:', process.env.CLERK_SECRET_KEY ? 'sk_live_...' + process.env.CLERK_SECRET_KEY.slice(-4) : 'NOT SET');

// Define role hierarchy (1 = highest, 9 = lowest)
const DEMO_USERS = [
  {
    email: 'role1@scratchie.com',
    firstName: 'Super',
    lastName: 'Admin',
    password: 'DemoUser123!',
    metadata: {
      role_id: 1,
      role_name: 'mend_super_admin',
      role_label: 'MEND Super Admin',
      hierarchy_level: 1,
      permissions: 'full_system_access',
      description: 'Complete system control and user management'
    }
  },
  {
    email: 'role2@scratchie.com',
    firstName: 'Account',
    lastName: 'Manager',
    password: 'DemoUser123!',
    metadata: {
      role_id: 2,
      role_name: 'mend_account_manager',
      role_label: 'MEND Account Manager',
      hierarchy_level: 2,
      permissions: 'account_management',
      description: 'Manage client accounts and relationships'
    }
  },
  {
    email: 'role3@scratchie.com',
    firstName: 'Data',
    lastName: 'Admin',
    password: 'DemoUser123!',
    metadata: {
      role_id: 3,
      role_name: 'administrator',
      role_label: 'Administrator',
      hierarchy_level: 3,
      permissions: 'data_management',
      description: 'Administrative data entry and management'
    }
  },
  {
    email: 'role4@scratchie.com',
    firstName: 'Data',
    lastName: 'Analyst',
    password: 'DemoUser123!',
    metadata: {
      role_id: 4,
      role_name: 'mend_analyst',
      role_label: 'MEND Analyst',
      hierarchy_level: 4,
      permissions: 'analytics_access',
      description: 'View analytics and generate reports'
    }
  },
  {
    email: 'role5@scratchie.com',
    firstName: 'Builder',
    lastName: 'Admin',
    password: 'DemoUser123!',
    metadata: {
      role_id: 5,
      role_name: 'builder_admin',
      role_label: 'Builder Admin',
      hierarchy_level: 5,
      permissions: 'builder_management',
      description: 'Manage builder organization and sites'
    }
  },
  {
    email: 'role6@scratchie.com',
    firstName: 'Site',
    lastName: 'Admin',
    password: 'DemoUser123!',
    metadata: {
      role_id: 6,
      role_name: 'site_admin',
      role_label: 'Site Admin',
      hierarchy_level: 6,
      permissions: 'site_management',
      description: 'Manage individual construction sites'
    }
  },
  {
    email: 'role7@scratchie.com',
    firstName: 'Client',
    lastName: 'User',
    password: 'DemoUser123!',
    metadata: {
      role_id: 7,
      role_name: 'client',
      role_label: 'Client',
      hierarchy_level: 7,
      permissions: 'client_access',
      description: 'Client-level access to relevant data'
    }
  },
  {
    email: 'role8@scratchie.com',
    firstName: 'Vendor',
    lastName: 'User',
    password: 'DemoUser123!',
    metadata: {
      role_id: 8,
      role_name: 'vendor',
      role_label: 'Vendor',
      hierarchy_level: 8,
      permissions: 'vendor_access',
      description: 'Vendor-specific access and tools'
    }
  },
  {
    email: 'role9@scratchie.com',
    firstName: 'Public',
    lastName: 'User',
    password: 'DemoUser123!',
    metadata: {
      role_id: 9,
      role_name: 'public',
      role_label: 'Public User',
      hierarchy_level: 9,
      permissions: 'read_only',
      description: 'Public read-only access'
    }
  }
];

async function createProductionUsers() {
  console.log('🚀 Starting PRODUCTION demo user creation...\n');
  console.log('⚠️  WARNING: This will create users in your PRODUCTION Clerk instance!');
  console.log('   Domain: https://mendplatform.au\n');

  // Check if Clerk secret key is configured
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('❌ Error: CLERK_SECRET_KEY not found in environment variables');
    console.log('Please ensure your .env file contains CLERK_SECRET_KEY');
    process.exit(1);
  }

  // Verify it's a production key
  if (!process.env.CLERK_SECRET_KEY.startsWith('sk_live_')) {
    console.error('❌ Error: This is NOT a production Clerk secret key!');
    console.log('   Found:', process.env.CLERK_SECRET_KEY.substring(0, 10) + '...');
    console.log('   Expected: sk_live_...');
    console.log('\nPlease update your .env file with the production secret key from Clerk dashboard.');
    process.exit(1);
  }

  console.log('✅ Using production Clerk secret key\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const userData of DEMO_USERS) {
    try {
      console.log(`📝 Processing ${userData.email} (${userData.metadata.role_label})...`);

      // Check if user already exists
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [userData.email]
      });

      if (existingUsers.data && existingUsers.data.length > 0) {
        console.log(`⏭️  User ${userData.email} already exists, updating metadata...`);
        
        // Update existing user's metadata
        await clerk.users.updateUser(existingUsers.data[0].id, {
          publicMetadata: userData.metadata,
          firstName: userData.firstName,
          lastName: userData.lastName
        });
        
        console.log(`✅ Updated ${userData.email} metadata\n`);
        skipCount++;
        continue;
      }

      // Create new user without phone number (simpler approach)
      const newUser = await clerk.users.createUser({
        emailAddress: [userData.email],
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicMetadata: userData.metadata,
        skipPasswordChecks: true,
        skipPasswordRequirement: false
      });

      console.log(`✅ Created ${userData.email} - ${userData.metadata.role_label}`);
      console.log(`   Hierarchy Level: ${userData.metadata.hierarchy_level} (${userData.metadata.hierarchy_level === 1 ? 'Highest' : userData.metadata.hierarchy_level === 9 ? 'Lowest' : 'Mid-level'})`);
      console.log(`   Permissions: ${userData.metadata.permissions}\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ Error creating ${userData.email}:`, error.errors?.[0]?.message || error.message || error);
      if (error.errors) {
        console.log('   Full error details:', JSON.stringify(error.errors, null, 2));
      }
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 PRODUCTION Summary:');
  console.log(`   ✅ Created: ${successCount} users`);
  console.log(`   ⏭️  Updated: ${skipCount} existing users`);
  console.log(`   ❌ Errors: ${errorCount} users`);
  console.log('='.repeat(50));

  if (successCount + skipCount === DEMO_USERS.length) {
    console.log('\n🎉 All PRODUCTION demo users are ready!');
    console.log('\n📝 Login Credentials:');
    console.log('   Password for all users: DemoUser123!');
    console.log('\n🔑 Role Hierarchy (1=Highest, 9=Lowest):');
    DEMO_USERS.forEach(user => {
      const level = user.metadata.hierarchy_level;
      const indicator = level === 1 ? '👑' : level === 9 ? '👤' : '👥';
      console.log(`   ${indicator} Level ${level}: ${user.email} - ${user.metadata.role_label}`);
    });
    console.log('\n✨ You can now test the login at: https://mendplatform.au');
  } else if (errorCount > 0) {
    console.log('\n⚠️  Some users could not be created.');
    console.log('Please check the error messages above and try again.');
  }
}

// Run the script
createProductionUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
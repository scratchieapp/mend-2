# Clerk Integration Setup Instructions

## 🚀 Quick Start Guide

### Step 1: Create Your Clerk Account

1. Go to [https://clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application with the name "Mend Safety" or similar
3. Choose "Email" as your authentication method

### Step 2: Get Your API Keys

1. In your Clerk Dashboard, go to **API Keys** (left sidebar)
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### Step 3: Update Your .env File

Replace the placeholder values in your `.env` file:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
```

### Step 4: Create Test Users in Clerk

In your Clerk Dashboard:

1. Go to **Users** (left sidebar)
2. Click **Create user** button
3. Create these demo accounts with their emails and set passwords:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| role1@scratchie.com | Choose a password | Super Admin | Full system access |
| role2@scratchie.com | Choose a password | Account Manager | Manage accounts |
| role3@scratchie.com | Choose a password | Data Entry | Enter data |
| role5@scratchie.com | Choose a password | Builder Admin | Builder administration |

**Note**: Use the same password for all demo accounts for easier testing, like `TestPassword123!`

### Step 5: Configure Clerk Settings

In your Clerk Dashboard:

1. **Email & Password Settings** (Authentication → Email):
   - Enable "Email address" as identifier
   - Enable "Password" authentication
   - Optional: Disable email verification for testing

2. **Session Settings** (Sessions):
   - Set session lifetime to 7 days (or your preference)
   - Enable "Stay signed in" option

3. **Redirects** (optional):
   - Sign-in URL: `/auth/login`
   - Sign-up URL: `/auth/signup`
   - After sign-in URL: `/dashboard`
   - After sign-up URL: `/dashboard`

### Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:8082/auth/clerk-login`

3. Try logging in with one of the demo accounts you created

### Step 7: Enable Production Features (Optional)

Once testing is complete:

1. **Custom Domain**: Set up your custom domain in Clerk Dashboard → Domains
2. **Branding**: Customize the appearance in Clerk Dashboard → Customization
3. **Email Templates**: Customize email templates for password reset, etc.
4. **Production Keys**: Switch to production keys when deploying

## 🔧 Troubleshooting

### Common Issues:

1. **"Missing Clerk configuration" error**
   - Make sure you've added the keys to your `.env` file
   - Restart your development server after updating `.env`

2. **Login not working**
   - Verify users are created in Clerk Dashboard
   - Check that email/password authentication is enabled
   - Ensure your publishable key is correct

3. **Users not syncing with database**
   - Check browser console for errors
   - Verify Supabase connection is working
   - Check that the users table has the correct schema

## 📝 What's Happening Behind the Scenes

1. **ClerkAuthProvider**: Wraps your app and manages authentication state
2. **User Sync**: When a Clerk user signs in, we automatically:
   - Check if they exist in your Supabase database
   - Create them if they don't exist
   - Update their Clerk ID for future syncing
   - Assign roles based on their email

3. **Role Mapping**: Demo emails are automatically mapped to roles:
   - role1@scratchie.com → Super Admin (role_id: 1)
   - role2@scratchie.com → Account Manager (role_id: 2)
   - etc.

## 🎯 Next Steps

After basic setup is working:

1. Test password reset functionality (it should work immediately!)
2. Add more users with different roles
3. Customize the sign-in appearance
4. Set up webhooks for real-time user sync
5. Configure MFA for admin users

## 📞 Need Help?

- Clerk Documentation: [https://clerk.com/docs](https://clerk.com/docs)
- Clerk Support: Available through their dashboard
- Check the browser console for detailed error messages
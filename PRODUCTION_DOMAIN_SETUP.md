# 🚀 Production Domain Setup: MendPlatform.au

## ✅ What You've Done Already
- ✅ Purchased MendPlatform.au domain
- ✅ Added domain to Vercel
- ✅ Added domain to Clerk 
- ✅ Switched Clerk to production

## 🔄 What Needs to Happen Next

### Step 1: Update Vercel Environment Variables

You need to add your **PRODUCTION Clerk keys** to Vercel:

1. **Go to Vercel**: https://vercel.com/jameskells-projects/mend-2/settings/environment-variables

2. **Update/Add these variables**:
   ```
   VITE_CLERK_PUBLISHABLE_KEY
   ```
   Value: Your NEW production key (starts with `pk_live_...`)
   
   ```
   CLERK_SECRET_KEY  
   ```
   Value: Your NEW production secret (starts with `sk_live_...`)

3. **Get your production keys from Clerk**:
   - Go to: https://dashboard.clerk.com
   - Select your production app
   - Go to: Configure → API Keys
   - Copy the "Publishable key" and "Secret key"

### Step 2: Verify Clerk Configuration

In your Clerk Dashboard, make sure these are set correctly:

| Setting | Value |
|---------|-------|
| **Home URL** | `https://mendplatform.au` |
| **Sign-in URL** | `/auth/clerk-login` |
| **Sign-up URL** | `/auth/clerk-login` |
| **After sign-in URL** | `/` |
| **After sign-up URL** | `/` |

**Allowed Origins** should include:
```
https://mendplatform.au
https://*.vercel.app
http://localhost:8080
```

### Step 3: Redeploy

After updating the environment variables:

1. **Option A**: Trigger redeploy in Vercel Dashboard
   - Go to: https://vercel.com/jameskells-projects/mend-2
   - Click the "..." menu on latest deployment
   - Click "Redeploy"

2. **Option B**: Push a small change to trigger deployment
   ```bash
   git commit --allow-empty -m "trigger redeploy for production domain"
   git push origin main
   ```

### Step 4: Test

After redeployment:

1. **Clear browser cache completely**
2. **Open incognito window**
3. **Go to**: https://mendplatform.au/auth/clerk-login
4. **Test login with**: role1@scratchie.com / DemoUser123!

## 🚨 Why You're Seeing White Screen

The white screen happens because:

1. **Environment mismatch**: Your code is trying to use development Clerk keys with a production domain
2. **Missing environment variables**: Production Clerk keys aren't set in Vercel yet
3. **Clerk domain validation**: Production Clerk is strict about domain matching

## 📋 Troubleshooting Checklist

If you still see white screen after redeployment:

- [ ] Production Clerk keys are set in Vercel environment variables
- [ ] Clerk Home URL is set to `https://mendplatform.au`
- [ ] Allowed origins include `https://mendplatform.au`
- [ ] You've redeployed after changing environment variables
- [ ] You've cleared browser cache and cookies
- [ ] Demo users exist in your production Clerk instance

## 🔍 Checking Your Setup

### Verify Environment Variables Are Set:
1. Go to Vercel deployment
2. Check the build logs for any environment variable errors

### Verify Clerk Keys:
1. In browser console, you should see: "Clerk has been loaded with production keys"
2. NOT: "Clerk has been loaded with development keys"

### Quick Test:
```javascript
// Open browser console on https://mendplatform.au and run:
console.log('Clerk Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
// Should show pk_live_... not pk_test_...
```

## 🎯 Expected Result

After following these steps:
- ✅ https://mendplatform.au loads your app
- ✅ Login redirects to https://mendplatform.au/auth/clerk-login  
- ✅ After login, you reach the dashboard
- ✅ No white screen
- ✅ Console shows "production keys" not "development keys"

The redeployment is crucial because Vercel needs to rebuild the app with the new environment variables!
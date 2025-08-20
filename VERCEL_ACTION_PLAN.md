# 🚀 Vercel Configuration Action Plan

## Your deployment is ready but needs configuration!

**Production Domain**: https://mend-2.vercel.app

**⚠️ IMPORTANT**: The previous instructions had the wrong Clerk configuration! 
- Clerk expects **RELATIVE paths** (starting with `/`) for redirects
- Only Home URL and Allowed Origins need full URLs

## ✅ Step-by-Step Actions Required

### Step 1: Add Environment Variables to Vercel (5 minutes)

1. **Open this link**: [Vercel Environment Variables](https://vercel.com/jameskells-projects/mend-2/settings/environment-variables)

2. **Add these variables** (click "Add New" for each):

   ```
   VITE_SUPABASE_URL
   ```
   Value: `https://rkzcybthcszeusrohbtc.supabase.co`
   
   ```
   VITE_SUPABASE_ANON_KEY
   ```
   Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJremN5YnRoY3N6ZXVzcm9oYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODQ1MDAsImV4cCI6MjA0OTY2MDUwMH0.4It46NhFTc0q1KkXDUT5iMvQ9ewlTiEbqb0kLRs-sd0`
   
   ```
   VITE_CLERK_PUBLISHABLE_KEY
   ```
   Value: `pk_test_Y3VycmVudC1wb3Jwb2lzZS00NC5jbGVyay5hY2NvdW50cy5kZXYk`

3. **For each variable**:
   - ✅ Check "Production"
   - ✅ Check "Preview" 
   - ✅ Check "Development"
   - Click "Save"

4. **After adding all 3**, click the "Redeploy" button that appears

### Step 2: Configure Clerk Dashboard (5 minutes)

1. **Open Clerk Dashboard**: https://dashboard.clerk.com

2. **Sign in** and select your app: `current-porpoise-44`

3. **Go to**: Configure → Paths

4. **IMPORTANT**: Clerk expects **relative paths** (starting with `/`) for redirect URLs, NOT full URLs!

5. **Update these settings**:

   | Setting | Value | Notes |
   |---------|-------|-------|
   | **Home URL** | `https://mend-2.vercel.app` | Use stable domain (FULL URL) |
   | **Sign-in URL** | `/auth/clerk-login` | Relative path only |
   | **Sign-up URL** | `/auth/clerk-login` | Relative path only |
   | **After sign-in URL** | `/` | Relative path to root (dashboard loads here) |
   | **After sign-up URL** | `/` | Relative path to root (dashboard loads here) |

6. **Save the changes**

**Key Points**:
- Home URL gets the FULL production domain URL
- All redirect paths must be RELATIVE (start with `/`, no domain)
- Use `mend-2.vercel.app` (stable) not deployment-specific URLs

### Step 3: Add Allowed Origins in Clerk (2 minutes)

1. **Still in Clerk Dashboard**, go to: Configure → Allowed origins

2. **Add these origins** (one per line):
   ```
   https://mend-2.vercel.app
   https://*.vercel.app
   http://localhost:8080
   http://localhost:8082
   ```

3. **Click Save**

**Note**: Allowed origins need FULL URLs with protocol (https://)

### Step 4: Test the Deployment (2 minutes)

1. **Clear your browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)

2. **Open an incognito/private window**

3. **Go to**: https://mend-2.vercel.app/auth/clerk-login

4. **Test login with**:
   - Email: `role1@scratchie.com`
   - Password: `DemoUser123!`

5. **Verify**:
   - ✅ You stay on the mend-2.vercel.app domain (not redirected to localhost)
   - ✅ You reach the dashboard after login (loads at `/`)
   - ✅ No blank screen

## 🔧 Troubleshooting

### If you still see localhost redirects:
- Double-check that you used RELATIVE paths (starting with `/`) in Clerk Dashboard
- Make sure you saved all changes in Clerk Dashboard
- Wait 1-2 minutes for Clerk changes to propagate
- Clear cookies for both domains

### If you get "path must be relative" error in Clerk:
- Ensure redirect URLs start with `/` (e.g., `/auth/clerk-login`, not full URLs)
- Only the Home URL should be a full URL
- Don't include the domain in sign-in/sign-up/after-login paths

### If you get a blank screen:
- Check browser console (F12) for errors
- Verify all 3 environment variables are set in Vercel
- Make sure you redeployed after adding variables

### If login doesn't work:
- Verify the demo users still exist in Clerk
- Check that the password is exactly: `DemoUser123!`
- Try with a different browser

## 📝 Quick Test Checklist

After configuration, verify:
- [ ] Environment variables added to Vercel
- [ ] Clerk Home URL set to `https://mend-2.vercel.app` (full URL)
- [ ] Clerk redirect paths are relative (start with `/`)
- [ ] Allowed origins include `https://mend-2.vercel.app`
- [ ] Login works without localhost redirect
- [ ] Dashboard loads after authentication at `/`
- [ ] Password reset stays on production domain

## 🎯 Expected Result

After completing these steps:
1. Users can log in at your Vercel URL
2. They stay on the same domain throughout
3. Authentication works seamlessly
4. Password reset emails will work (Clerk handles this)

## 💡 Pro Tips

1. **Bookmark this URL** for easy access:
   ```
   https://mend-2.vercel.app/auth/clerk-login
   ```

2. **Remember the difference**:
   - **Home URL**: Full URL (`https://mend-2.vercel.app`)
   - **Redirect paths**: Relative only (`/auth/clerk-login`, `/`, etc.)
   - **Allowed origins**: Full URLs (`https://mend-2.vercel.app`)

3. **For custom domain** (when you get one):
   - Update the Home URL and allowed origins with your custom domain
   - Keep redirect paths relative (they don't change)

4. **For production Clerk** (recommended):
   - Create a production Clerk instance
   - Get production keys (start with `pk_live_`)
   - Use those in Vercel instead of test keys

## Need Help?

If issues persist after following all steps:
1. Check Vercel logs: https://vercel.com/jameskells-projects/mend-2/functions
2. Check Clerk logs: https://dashboard.clerk.com/apps/current-porpoise-44/logs
3. The code is already fixed and deployed - you just need the configuration!

---

**Time needed**: ~15 minutes total
**Difficulty**: Easy - just copying and pasting values!
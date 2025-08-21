#!/bin/bash

# Update Vercel environment variables to use the TEST Clerk instance
# where the demo users exist

echo "Updating Vercel environment variables..."

# The TEST Clerk keys from local .env where demo users exist
CLERK_PUBLISHABLE_KEY="pk_test_Y3VycmVudC1wb3Jwb2lzZS00NC5jbGVyay5hY2NvdW50cy5kZXYk"
CLERK_SECRET_KEY="sk_test_LKus9FTXlHfHsk3r74Q8KWRxhzmtkT5cbrlbrOdR3z"

# Update VITE_CLERK_PUBLISHABLE_KEY
echo "Updating VITE_CLERK_PUBLISHABLE_KEY..."
vercel env rm VITE_CLERK_PUBLISHABLE_KEY production --yes 2>/dev/null
echo "$CLERK_PUBLISHABLE_KEY" | vercel env add VITE_CLERK_PUBLISHABLE_KEY production

# Update CLERK_SECRET_KEY  
echo "Updating CLERK_SECRET_KEY..."
vercel env rm CLERK_SECRET_KEY production --yes 2>/dev/null
echo "$CLERK_SECRET_KEY" | vercel env add CLERK_SECRET_KEY production

echo "Environment variables updated!"
echo ""
echo "Now triggering a redeployment..."
vercel --prod

echo ""
echo "Done! The site should now use the TEST Clerk instance where the demo users exist."
echo ""
echo "Demo users that should now work:"
echo "- role1@scratchie.com (Super Admin)"
echo "- role2@scratchie.com (Account Manager)"
echo "- role3@scratchie.com (Data Admin)"
echo "- role4@scratchie.com (Data Analyst)"
echo "- role5@scratchie.com (Builder Admin)"
echo "- role6@scratchie.com (Site Admin)"
echo "- role7@scratchie.com (Client)"
echo "- role8@scratchie.com (Vendor)"
echo "- role9@scratchie.com (Public)"
echo ""
echo "Password for all: testpassword123"
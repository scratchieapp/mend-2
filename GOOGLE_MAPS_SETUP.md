# Google Maps API Setup

This guide will help you set up Google Maps for the incident location feature.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Make sure billing is enabled for the project

## Step 2: Enable Required APIs

Enable the following APIs in your Google Cloud project:

1. **Maps JavaScript API** - For displaying maps
2. **Geocoding API** - For converting addresses to coordinates
3. **Places API** (optional) - For address autocomplete

To enable:
1. Go to **APIs & Services** > **Library**
2. Search for each API and click **Enable**

## Step 3: Create an API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key

### Recommended: Restrict Your API Key

For security, restrict your API key:

1. Click on your API key to edit it
2. Under **Application restrictions**, select **HTTP referrers**
3. Add your domains:
   - `http://localhost:*` (for development)
   - `https://your-production-domain.com/*`
4. Under **API restrictions**, select **Restrict key** and choose:
   - Maps JavaScript API
   - Geocoding API

## Step 4: Add the API Key to Your Environment

### For Local Development

Add to your `.env.local` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add a new variable:
   - Name: `VITE_GOOGLE_MAPS_API_KEY`
   - Value: Your API key
   - Environment: Production, Preview, Development

## Step 5: Verify Setup

After adding the API key:

1. Restart your development server
2. Navigate to any incident details page
3. The map should now display the incident location

## Troubleshooting

### Map Not Loading

- Verify the API key is correct
- Check that Maps JavaScript API is enabled
- Ensure billing is enabled on your Google Cloud project
- Check browser console for error messages

### "This page can't load Google Maps correctly"

- Your API key may be restricted incorrectly
- Billing may not be set up
- You may have exceeded your quota

### Coordinates Not Accurate

The system will try to:
1. Use stored coordinates from the database
2. Fall back to city-level coordinates for Australian cities
3. Default to Sydney if no location data is available

For better accuracy, ensure site addresses are complete in the database.

## Pricing

Google Maps offers $200 free credit per month, which covers approximately:
- 28,000 map loads
- 40,000 geocoding requests

For most applications, this free tier is sufficient. See [Google Maps pricing](https://cloud.google.com/maps-platform/pricing) for details.


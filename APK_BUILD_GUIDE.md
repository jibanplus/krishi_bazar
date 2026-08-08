# APK Build Guide for কৃষি বাজার

## Method 1: PWA with TWA (Recommended - Easiest)

### Step 1: Build Production
```bash
npm run build
```

### Step 2: Deploy to Vercel
```bash
vercel --prod
```

### Step 3: Use Bubblewrap or PWA Builder
1. Go to https://www.pwabuilder.com/
2. Enter your Vercel URL
3. Select "Android" 
4. Build APK
5. Download APK

## Method 2: Capacitor (Full Native Features)

### Step 1: Install Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install -D @capacitor/assets
```

### Step 2: Initialize Capacitor
```bash
npx cap init "কৃষি বাজার" com.bengalimarket.app
```

### Step 3: Add Android Platform
```bash
npx cap add android
```

### Step 4: Update capacitor.config.json
```json
{
  "appId": "com.bengalimarket.app",
  "appName": "কৃষি বাজার",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

### Step 5: Build and Sync
```bash
npm run build
npx cap sync android
```

### Step 6: Build APK
```bash
npx cap open android
# Then in Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## Method 3: GoNative (Online Service)

1. Go to https://gonative.io/
2. Enter your Vercel URL
3. Configure app details
4. Build APK

## Important Notes:

- **App Name**: কৃষি বাজার
- **Package Name**: com.bengalimarket.app
- **Vercel URL**: Your production URL
- **Icon**: Use existing logo.svg
- **Permissions**: Internet only needed

## Quick Start (Method 1 - Recommended):

1. Run: `npm run build`
2. Deploy to Vercel
3. Use https://www.pwabuilder.com/ with your Vercel URL
4. Download APK

This is the fastest and easiest method!
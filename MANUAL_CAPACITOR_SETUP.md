# 🔧 Capacitor APK Build - Manual Setup Guide

## ⚠️ PowerShell Execution Policy Issue

আপনার system এ PowerShell execution policy disabled আছে, তাই npm commands directly run করা যাচ্ছে না। এই সমস্যা solve করার দুটি উপায় আছে:

---

## 🔓 Solution 1: Enable PowerShell Execution (Recommended)

### **Step 1: PowerShell as Administrator Run করুন**
1. Start menu এ "PowerShell" search করুন
2. Right-click → "Run as administrator"

### **Step 2: Execution Policy Enable করুন**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Step 3: Verify করুন**
```powershell
Get-ExecutionPolicy -List
```

### **Step 4: এখন Capacitor Setup Run করুন**
```powershell
cd C:\Users\jiban\bengali-market-
setup-capacitor.bat
```

---

## 🚀 Solution 2: Manual Step-by-Step Setup

### **Step 1: Install Dependencies**
```powershell
cd C:\Users\jiban\bengali-market-
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### **Step 2: Initialize Capacitor**
```powershell
npx cap init "কৃষি বাজার" com.bengalimarket.app
```

### **Step 3: Add Android Platform**
```powershell
npx cap add android
```

### **Step 4: Build the App**
```powershell
npm run build
```

### **Step 5: Sync with Android**
```powershell
npx cap sync android
```

### **Step 6: Open Android Studio**
```powershell
npx cap open android
```

### **Step 7: Build APK in Android Studio**
1. Android Studio এ project open হবে
2. Build → Build Bundle(s) / APK(s) → Build APK(s)
3. Select "Release" build
4. APK build হবে `app/build/outputs/apk/release/` এ
5. APK file copy করুন

---

## 🎯 Alternative: Use PWA Builder (No PowerShell Required)

যদি PowerShell issue solve করতে না চান তাহলে PWA Builder use করুন:

### **Steps:**
1. Browser এ যান: `https://pwabuilder.com`
2. Enter URL: `https://bengali-market.vercel.app/`
3. Click "Start"
4. Configure settings
5. Download APK directly

---

## 📋 Configuration Files Created

### **1. capacitor.config.json**
```json
{
  "appId": "com.bengalimarket.app",
  "appName": "কৃষি বাজার",
  "webDir": "dist",
  "android": {
    "buildOptions": {
      "keystorePath": "",
      "keystoreAlias": "",
      "keystoreAliasPassword": "",
      "keystorePassword": ""
    }
  }
}
```

### **2. package.json (Updated)**
```json
{
  "scripts": {
    "cap:sync": "cap sync",
    "cap:open:android": "cap open android",
    "cap:build:android": "npm run build && cap sync android"
  }
}
```

### **3. setup-capacitor.bat**
- Automated setup script
- Double-click করলে run হবে (যদি PowerShell enabled থাকে)

---

## 🔧 Troubleshooting

### **Issue: PowerShell Execution Policy**
**Error:** `running scripts is disabled on this system`

**Solution:**
```powershell
# PowerShell as Administrator run করুন
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue: Node.js Not Found**
**Error:** `npm is not recognized`

**Solution:**
1. Node.js download করুন: https://nodejs.org/
2. Install করুন
3. Restart PowerShell
4. Verify: `node --version` এবং `npm --version`

### **Issue: Android Studio Not Found**
**Error:** `ANDROID_HOME not set`

**Solution:**
1. Android Studio download করুন: https://developer.android.com/studio
2. Install করুন
3. Environment variable set করুন:
   - `ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools`
   - Add to PATH: `%ANDROID_HOME%\emulator`

---

## 🎯 Quick Start Summary

### **If PowerShell Enabled:**
```powershell
cd C:\Users\jiban\bengali-market-
setup-capacitor.bat
```

### **If PowerShell Disabled:**
1. Enable PowerShell execution policy
2. Run setup-capacitor.bat
3. অথবা manual steps follow করুন

### **Easiest Alternative:**
Use PWA Builder at https://pwabuilder.com with your Vercel URL

---

## 📞 Next Steps

### **After Capacitor Setup:**
1. Android Studio এ project open হবে
2. Build APK from Android Studio
3. Test APK on your device
4. Deploy to users

### **After PWA Builder:**
1. Download APK directly
2. Install on your device
3. Test functionality
4. Deploy to users

---

## ✅ Status

- **Configuration Files:** ✅ Created
- **Package.json:** ✅ Updated
- **Setup Script:** ✅ Created
- **Manual Guide:** ✅ Complete

**Next:** Enable PowerShell অথবা use PWA Builder

---

## 🚀 Ready to Build!

আপনার project Capacitor setup এর জন্য ready। এখন:
1. PowerShell enable করুন অথবা
2. PWA Builder use করুন
3. APK build করুন

**Good luck! 🎉**

@echo off
echo Setting up Capacitor for APK Build...
echo.

echo Step 1: Installing Capacitor dependencies...
call npm install @capacitor/core @capacitor/cli @capacitor/android
echo.

echo Step 2: Initializing Capacitor...
call npx cap init "কৃষি বাজার" com.bengalimarket.app
echo.

echo Step 3: Adding Android platform...
call npx cap add android
echo.

echo Step 4: Building the app...
call npm run build
echo.

echo Step 5: Syncing with Android...
call npx cap sync android
echo.

echo Step 6: Opening Android Studio...
call npx cap open android
echo.

echo Setup Complete!
echo Open Android Studio to build the APK.
pause
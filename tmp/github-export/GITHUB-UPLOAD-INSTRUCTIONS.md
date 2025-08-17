# 📤 GITHUB UPLOAD INSTRUKCIJE

## 🎯 BRZE INSTRUKCIJE

**Repository URL**: https://github.com/gruica/servis-todosijevic-mobile

### Korak 1: Upload svih fajlova
1. Idite na https://github.com/gruica/servis-todosijevic-mobile
2. Kliknite **"Upload files"** (ako je prazan repo)
3. **Drag & drop** sve fajlove iz ovog foldera
4. **Commit message**: `Initial project setup with GitHub Actions APK build`
5. Kliknite **"Commit changes"**

### Korak 2: Verifikacija GitHub Actions
1. Idite na **"Actions"** tab
2. Videćete **"Build Android APK"** workflow
3. Workflow će se pokrenuti automatski
4. Build traje **10-15 minuta**

### Korak 3: Download APK
1. Nakon završetka build-a (zelena kvačica ✅)
2. Scroll dole do **"Artifacts"**
3. Download **"servis-todosijevic-debug-apk"**
4. Unzip = Gotov APK!

## 📱 APK Specifikacije
- **Ime**: servis-todosijevic-debug.apk
- **Veličina**: ~25-30 MB
- **Android**: 7.0+ (API 24)
- **Architecture**: Universal (ARM + x86)

## 🔄 Automatski Process
Na svaki buduci push, GitHub će automatski kreirati novi APK.

**Releases**: https://github.com/gruica/servis-todosijevic-mobile/releases
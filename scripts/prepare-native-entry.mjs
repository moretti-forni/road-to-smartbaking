import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const nativeWebDirs = {
  android: 'android/app/src/main/assets/public',
  ios: 'ios/App/App/public',
};
const nativeWebDir = nativeWebDirs[process.env.CAPACITOR_PLATFORM_NAME];

if (nativeWebDir) {
  // Native WebViews serve index.html for every extensionless URL.
  await copyFile(
    join(process.env.CAPACITOR_WEB_DIR, '__spa-fallback.html'),
    join(process.env.CAPACITOR_ROOT_DIR, nativeWebDir, 'index.html'),
  );
}

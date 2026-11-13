#!/bin/sh
set -eu
for _jdk in /home/box/tools/jdk-17.0.21+9/bin /workspace/tools/jdk/bin; do
  if [ -x "$_jdk/javac" ]; then PATH="$_jdk:$PATH"; fi
done
export PATH
unset _jdk
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
if [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  if [ -d /workspace/tools/android/platforms/android-34 ]; then ANDROID_SDK_ROOT=/workspace/tools/android
  else ANDROID_SDK_ROOT=/workspace/.android-sdk
  fi
fi
SDK="$ANDROID_SDK_ROOT"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT="$ROOT/build"
DEPS="$OUT/deps"
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/gen" "$OUT/host" "$DEPS" "$OUT/res"

javac --release 11 -d "$OUT/host" \
  "$ROOT/src/com/savepress/launcher/SaveText.java" \
  "$ROOT/src/com/savepress/launcher/Codec.java" \
  "$ROOT/src/com/savepress/launcher/BulldozerText.java" \
  "$ROOT/src/com/savepress/launcher/SaveTextTest.java"
java -cp "$OUT/host" com.savepress.launcher.SaveTextTest

M2=/tmp/android-dl/m2
SHIZUKU_KEEP="${SHIZUKU_KEEP:-/tmp/shizuku-keep}"
if [ -f "$SHIZUKU_KEEP/shizuku.jar" ]; then
  cp "$SHIZUKU_KEEP/shizuku.jar" "$OUT/shizuku.jar"
elif [ -d "$M2" ]; then
  cd "$DEPS"
  unzip -qo -n "$M2/a/classes.jar"
  unzip -qo -n "$M2/aid/classes.jar"
  unzip -qo -n "$M2/s/classes.jar"
  unzip -qo -n "$M2/p/classes.jar"
  cd "$ROOT"
  jar cf "$OUT/shizuku.jar" -C "$DEPS" .
else
  echo "Shizuku jars not found. Put them in $SHIZUKU_KEEP or $M2." >&2
  exit 1
fi

"$BT/aapt2" compile --dir "$ROOT/res" -o "$OUT/res.zip"
"$BT/aapt2" link -I "$JAR" \
  --manifest "$ROOT/AndroidManifest.xml" \
  --min-sdk-version 26 \
  --target-sdk-version 34 \
  --version-code 15 \
  --version-name 2.4 \
  --java "$OUT/gen" \
  -o "$OUT/base.apk" \
  "$OUT/res.zip"

javac --release 11 -classpath "$JAR:$OUT/shizuku.jar" -d "$OUT/classes" \
  $(find "$ROOT/src/com/savepress/launcher" -name '*.java' ! -name 'SaveTextTest.java') \
  $(find "$OUT/gen" -name '*.java')

"$BT/d8" --min-api 26 --lib "$JAR" --output "$OUT" \
  $(find "$OUT/classes" -name '*.class') \
  "$OUT/shizuku.jar"

cd "$OUT"
"$BT/aapt" add -f base.apk classes.dex >/dev/null
"$BT/zipalign" -f -p 4 base.apk aligned.apk
if [ ! -f "$ROOT/debug.keystore" ]; then
  keytool -genkeypair -keystore "$ROOT/debug.keystore" -storepass android -keypass android \
    -alias savepress -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Savepress" >/dev/null
fi
"$BT/apksigner" sign --ks "$ROOT/debug.keystore" --ks-pass pass:android --key-pass pass:android \
  --out "$OUT/Savepress.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose "$OUT/Savepress.apk"
mkdir -p /workspace/artifacts /workspace/savepress
cp "$OUT/Savepress.apk" /workspace/artifacts/Savepress.apk
cp "$OUT/Savepress.apk" /workspace/savepress/SavePress.apk
echo "APK $(wc -c < /workspace/savepress/SavePress.apk) bytes"

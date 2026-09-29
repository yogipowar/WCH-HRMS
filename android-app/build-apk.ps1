$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.14.7-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$sdk = $env:ANDROID_HOME
$sdkmanager = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"
$gradleHome = Join-Path $env:LOCALAPPDATA "gradle-8.7"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path $sdkmanager)) {
  throw "Android command-line tools are missing at $sdkmanager"
}

Write-Host "Installing Android SDK packages..."
& $sdkmanager --sdk_root=$sdk "platforms;android-34" "build-tools;34.0.0" "platform-tools"
if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed" }

if (-not (Test-Path (Join-Path $gradleHome "bin\gradle.bat"))) {
  Write-Host "Downloading Gradle 8.7..."
  $gradleZip = Join-Path $env:TEMP "gradle-8.7-bin.zip"
  Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -OutFile $gradleZip
  $extract = Join-Path $env:TEMP "gradle-extract"
  if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
  Expand-Archive -Path $gradleZip -DestinationPath $extract -Force
  if (Test-Path $gradleHome) { Remove-Item $gradleHome -Recurse -Force }
  Move-Item (Get-ChildItem $extract | Select-Object -First 1).FullName $gradleHome
}

Set-Location $root
& (Join-Path $gradleHome "bin\gradle.bat") assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

$built = Join-Path $root "app\build\outputs\apk\debug\app-debug.apk"
$dest = Join-Path (Split-Path $root) "WCH-HRMS.apk"
Copy-Item $built $dest -Force
Write-Host "APK ready: $dest"

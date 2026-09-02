/**
 * Creates a clean zip of the API source using a temporary staging directory and ZipFile::CreateFromDirectory.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const API_SRC = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/api");
const OUT_ZIP = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/hostinger_api.zip");
const STAGE_DIR = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/temp_api_stage");

if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
  console.log(`🗑️ Deleted existing zip: ${OUT_ZIP}`);
}

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem

$apiDir = '${API_SRC.replace(/\\/g, "/")}'
$outZip = '${OUT_ZIP.replace(/\\/g, "/")}'
$stageDir = '${STAGE_DIR.replace(/\\/g, "/")}'

if (Test-Path $outZip) { Remove-Item -Force $outZip }
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }

New-Item -ItemType Directory -Path $stageDir | Out-Null

Copy-Item -Recurse -Path "$apiDir/src" -Destination "$stageDir/src"
Copy-Item -Path "$apiDir/package.json" -Destination "$stageDir/package.json"
Copy-Item -Path "$apiDir/package-lock.json" -Destination "$stageDir/package-lock.json"

$distDir = '${path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/project/dist").replace(/\\/g, "/")}'
if (Test-Path $distDir) {
    New-Item -ItemType Directory -Path "$stageDir/public" -Force | Out-Null
    Copy-Item -Recurse -Path "$distDir/*" -Destination "$stageDir/public" -Force
    Copy-Item -Recurse -Path $distDir -Destination "$stageDir/public/dist" -Force
    Copy-Item -Recurse -Path $distDir -Destination "$stageDir/dist" -Force
}

if (Test-Path "$apiDir/.env.production") {
    Copy-Item -Path "$apiDir/.env.production" -Destination "$stageDir/.env"
} else {
    Copy-Item -Path "$apiDir/.env" -Destination "$stageDir/.env"
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $outZip)
Remove-Item -Recurse -Force $stageDir

Write-Host "✅ hostinger_api.zip created successfully!"
`;

const psScriptPath = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/build_api_zip.ps1");
fs.writeFileSync(psScriptPath, psScript, "utf8");

console.log("🚀 Creating hostinger_api.zip via PowerShell staging...");
try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, {
    stdio: "inherit",
    cwd: API_SRC,
  });
} finally {
  if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
}

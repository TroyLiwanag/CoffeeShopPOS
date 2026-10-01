/**
 * Creates a clean API zip for Hostinger deployment.
 *
 * IMPORTANT: The `uploads/` directory is intentionally EXCLUDED from this zip.
 * Uploads live on the Hostinger server and must NEVER be overwritten during deploys.
 * The folder will be created automatically by the server on first run if absent.
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const API_SRC   = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\api";
const DIST_DIR  = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\project\\dist";
const OUT_ZIP   = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\hostinger_api.zip";
const STAGE_DIR = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\temp_api_stage";

if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
  console.log("Deleted old zip.");
}

// Build PowerShell script as plain concatenated strings (no template literals with backticks)
const lines = [
  "Add-Type -AssemblyName System.IO.Compression.FileSystem",
  "",
  "$apiDir   = '" + API_SRC   + "'",
  "$distDir  = '" + DIST_DIR  + "'",
  "$outZip   = '" + OUT_ZIP   + "'",
  "$stageDir = '" + STAGE_DIR + "'",
  "",
  "if (Test-Path $outZip)   { Remove-Item -Force $outZip }",
  "if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }",
  "New-Item -ItemType Directory -Path $stageDir | Out-Null",
  "",
  "# Core API source",
  "Copy-Item -Recurse -Path \"$apiDir\\src\" -Destination \"$stageDir\\src\"",
  "Copy-Item -Path \"$apiDir\\package.json\"      -Destination \"$stageDir\\package.json\"",
  "Copy-Item -Path \"$apiDir\\package-lock.json\" -Destination \"$stageDir\\package-lock.json\"",
  "",
  "# Environment file",
  "if (Test-Path \"$apiDir\\.env.production\") {",
  "    Copy-Item -Path \"$apiDir\\.env.production\" -Destination \"$stageDir\\.env\"",
  "    Write-Host '  -> Included .env.production as .env'",
  "} else {",
  "    Copy-Item -Path \"$apiDir\\.env\" -Destination \"$stageDir\\.env\"",
  "    Write-Host '  -> Included .env'",
  "}",
  "",
  "# Frontend dist embedded into API public/",
  "if (Test-Path $distDir) {",
  "    New-Item -ItemType Directory -Path \"$stageDir\\public\" -Force | Out-Null",
  "    Copy-Item -Recurse -Path \"$distDir\\*\" -Destination \"$stageDir\\public\" -Force",
  "    Write-Host '  -> Embedded frontend dist into public/'",
  "} else {",
  "    Write-Host '  WARNING: project/dist not found. Run npm run build in /project first!'",
  "}",
  "",
  "# UPLOADS: intentionally excluded to protect live images on Hostinger",
  "Write-Host '  -> uploads/ EXCLUDED — live images on Hostinger are safe'",
  "",
  "# Create zip",
  "[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $outZip)",
  "Remove-Item -Recurse -Force $stageDir",
  "",
  "Write-Host ''",
  "Write-Host '=== hostinger_api.zip created! ==='",
  "Write-Host ''",
  "Write-Host 'IMPORTANT: When uploading to Hostinger File Manager,'",
  "Write-Host 'choose EXTRACT and overwrite — do NOT delete existing files first.'",
  "Write-Host 'Your uploads/ folder and product images will be preserved.'",
];

const psScriptPath = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\build_api_zip.ps1";
fs.writeFileSync(psScriptPath, lines.join("\r\n"), "utf8");

console.log("Creating hostinger_api.zip (uploads/ excluded to protect live images)...");
try {
  execSync('powershell -ExecutionPolicy Bypass -File "' + psScriptPath + '"', {
    stdio: "inherit",
    cwd: API_SRC,
  });
} finally {
  if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
}

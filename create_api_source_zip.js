/**
 * Creates a source-only API zip for Hostinger auto-build deployment.
 * - Excludes: node_modules, uploads, .env (production env is set in hPanel)
 * - Includes: src/, package.json, package-lock.json, server.js (root entry)
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const API_SRC   = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\api";
const DIST_DIR  = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\project\\dist";
const OUT_ZIP   = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\hostinger_api_source.zip";
const STAGE_DIR = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\temp_api_source_stage";

if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
  console.log("Deleted old source zip.");
}

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
  "# Source code only",
  "Copy-Item -Recurse -Path \"$apiDir\\src\" -Destination \"$stageDir\\src\"",
  "Copy-Item -Path \"$apiDir\\package.json\"      -Destination \"$stageDir\\package.json\"",
  "Copy-Item -Path \"$apiDir\\package-lock.json\" -Destination \"$stageDir\\package-lock.json\"",
  "Copy-Item -Path \"$apiDir\\server.js\"         -Destination \"$stageDir\\server.js\"",
  "",
  "# Frontend dist embedded into public/",
  "if (Test-Path $distDir) {",
  "    New-Item -ItemType Directory -Path \"$stageDir\\public\" -Force | Out-Null",
  "    Copy-Item -Recurse -Path \"$distDir\\*\" -Destination \"$stageDir\\public\" -Force",
  "    Write-Host '  -> Embedded frontend dist into public/'",
  "} else {",
  "    Write-Host '  WARNING: project/dist not found. Run npm run build in /project first!'",
  "}",
  "",
  "# EXCLUDED: node_modules, uploads, .env",
  "Write-Host '  -> node_modules, uploads/, .env EXCLUDED (safe for Hostinger auto-build)'",
  "",
  "[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $outZip)",
  "Remove-Item -Recurse -Force $stageDir",
  "",
  "Write-Host ''",
  "Write-Host '=== hostinger_api_source.zip created! ==='",
];

const psScriptPath = "d:\\wamp64\\www\\coffeeshop\\coffeeshop\\build_api_source_zip.ps1";
fs.writeFileSync(psScriptPath, lines.join("\r\n"), "utf8");

console.log("Creating hostinger_api_source.zip for Hostinger auto-build...");
try {
  execSync('powershell -ExecutionPolicy Bypass -File "' + psScriptPath + '"', {
    stdio: "inherit",
    cwd: API_SRC,
  });
} finally {
  if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
}

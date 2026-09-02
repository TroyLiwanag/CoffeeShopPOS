/**
 * Creates a zip of the frontend dist build for Hostinger static deployment.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST_SRC = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/project/dist");
const OUT_ZIP = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/hostinger_frontend.zip");

if (fs.existsSync(OUT_ZIP)) {
  fs.unlinkSync(OUT_ZIP);
  console.log(`🗑️ Deleted existing zip: ${OUT_ZIP}`);
}

function getAllFiles(dir, base = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath).replace(/\\/g, "/"); // Force forward slashes
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, base));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

const files = getAllFiles(DIST_SRC);
console.log(`📦 Packaging ${files.length} static frontend files...`);

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open('${OUT_ZIP.replace(/\\/g, "\\\\")}', 'Create')
${files
  .map(
    ({ fullPath, relPath }) =>
      `[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, '${fullPath.replace(/\\/g, "/")}', '${relPath}', 'Optimal') | Out-Null`
  )
  .join("\n")}
$zip.Dispose()
Write-Host "✅ hostinger_frontend.zip created with ${files.length} files"
`;

const psScriptPath = path.resolve("d:/wamp64/www/coffeeshop/CoffeeShop/build_frontend_zip.ps1");
fs.writeFileSync(psScriptPath, psScript, "utf8");
try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, { stdio: "inherit" });
} finally {
  fs.unlinkSync(psScriptPath);
}

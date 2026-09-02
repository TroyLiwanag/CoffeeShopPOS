import fs from "fs";

const uploadUrl =
  "https://srv2090-files.hstgr.io/rest/8c179e7dd7e56b33/api/tus/public_html";
const authKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTg3MDU1NDM2MSIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4NzgxNjYzMCwiaWF0IjoxNzg3Nzk1MDMwfQ.a70Dxl2_u3I0G5rjLZS2K4Ab2GH2iuS4PVLdSAapJIM";
const restAuthKey =
  "e93ee272114c568c2524cabf37c5bf2e0f41f0ee00341b313126dc197eb7ab86-8c179e7dd7e56b33";

const phpScript = `<?php
echo "HTACCESS_PUBLIC_HTML:\n" . @file_get_contents(__DIR__ . '/.htaccess') . "\n";
echo "HTACCESS_API:\n" . @file_get_contents(__DIR__ . '/api/.htaccess') . "\n";
`;

async function main() {
  fs.writeFileSync("debug_route.php", phpScript, "utf8");
  const size = fs.statSync("debug_route.php").size;

  await fetch(`${uploadUrl}/debug_route.php?override=true`, {
    method: "POST",
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(size),
      "Upload-Offset": "0",
    },
  });

  await fetch(`${uploadUrl}/debug_route.php?override=true`, {
    method: "PATCH",
    headers: {
      "X-Auth": authKey,
      "X-Auth-Rest": restAuthKey,
      "Tus-Resumable": "1.0.0",
      "Content-Type": "application/offset+octet-stream",
      "Upload-Offset": "0",
    },
    body: fs.readFileSync("debug_route.php"),
  });

  const res = await fetch("https://cafecorazon.shop/debug_route.php");
  console.log(await res.text());

  // Clean up
  await fetch(`${uploadUrl}/debug_route.php?override=true`, { method: "DELETE" }).catch(
    () => {},
  );
  if (fs.existsSync("debug_route.php")) fs.unlinkSync("debug_route.php");
}

main().catch(console.error);

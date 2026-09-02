export function parseUserAgent(ua = "") {
  const agent = ua || "Unknown";
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "Desktop";

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(agent)) {
    deviceType = "Mobile";
  } else if (/ipad|tablet|playbook|silk/i.test(agent)) {
    deviceType = "Tablet";
  }

  if (/edg\//i.test(agent)) browser = "Edge";
  else if (/chrome/i.test(agent) && !/edg/i.test(agent)) browser = "Chrome";
  else if (/safari/i.test(agent) && !/chrome/i.test(agent)) browser = "Safari";
  else if (/firefox/i.test(agent)) browser = "Firefox";
  else if (/msie|trident/i.test(agent)) browser = "IE";

  if (/windows nt/i.test(agent)) os = "Windows";
  else if (/mac os x/i.test(agent)) os = "macOS";
  else if (/android/i.test(agent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(agent)) os = "iOS";
  else if (/linux/i.test(agent)) os = "Linux";

  return JSON.stringify({ browser, os, deviceType, raw: agent.slice(0, 500) });
}

export function formatDeviceInfo(deviceInfoJson) {
  try {
    const d = JSON.parse(deviceInfoJson);
    return `${d.deviceType} · ${d.browser} · ${d.os}`;
  } catch {
    return deviceInfoJson || "—";
  }
}

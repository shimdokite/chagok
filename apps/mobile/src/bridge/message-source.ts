import { isAllowedApplyUrl } from "@chagok/contracts";

export function applyMessageUrl(
  source: string,
  documentUrl: string | null,
  origin: string,
  platform: string,
): string | null {
  if (!documentUrl || !isAllowedApplyUrl(documentUrl, origin)) return null;
  if (isAllowedApplyUrl(source, origin)) return documentUrl;
  // Android WebMessageListener reports sourceOrigin, while iOS and the older
  // Android bridge report a full URL. This exception never authorizes navigation.
  if (platform === "android") {
    const expected = new URL(origin).origin;
    if (source === expected || source === `${expected}/`) return documentUrl;
  }
  return null;
}

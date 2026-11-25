type Asset = { uri: string; mimeType?: string; fileSize?: number };
type Ports = {
  permission(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  launch(
    source: "camera" | "library",
  ): Promise<{ canceled: boolean; assets: Asset[] | null }>;
};

export async function selectReceipt(
  source: "camera" | "library",
  signal: AbortSignal,
  ports: Ports,
) {
  signal.throwIfAborted();
  if (source === "camera") {
    const permission = await ports.permission();
    signal.throwIfAborted();
    if (!permission.granted)
      throw {
        code: permission.canAskAgain
          ? "PERMISSION_DENIED"
          : "PERMISSION_SETTINGS",
      };
  }
  const result = await ports.launch(source);
  signal.throwIfAborted();
  return result.canceled ? null : (result.assets?.[0] ?? null);
}

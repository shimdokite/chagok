// No authentication credentials in browser localStorage or the preview iframe.
export const storage = {
  get: async () => null,

  set: async (_token: string) => {
    throw new Error("Native secure storage required");
  },

  remove: async () => {},
};
const metrics = new Map<string, string>();
export const metricStorage = {
  get: async (key: string) => metrics.get(key) ?? null,

  set: async (key: string, value: string) => {
    metrics.set(key, value);
  },
};

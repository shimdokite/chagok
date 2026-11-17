import * as SecureStore from "expo-secure-store";

const key = "chagok.session.v1";
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const storage = {
  get: () => SecureStore.getItemAsync(key, options),

  set: (token: string) => SecureStore.setItemAsync(key, token, options),

  remove: () => SecureStore.deleteItemAsync(key, options),
};
export const metricStorage = {
  get: (key: string) =>
    SecureStore.getItemAsync(`chagok.restore-metrics.v2.${key}`),

  set: (key: string, value: string) =>
    SecureStore.setItemAsync(
      `chagok.restore-metrics.v2.${key}`,
      value,
      options,
    ),
};

import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { ReceiptJournal } from "./metrics";

const runId = `receipt-ui-${Date.now()}`;
const environment = {
  runId,
  os: `${Platform.OS} ${Platform.Version}`,
  build: "development",
  storage: "local development; verify backend configuration separately",
};
const journal = new ReceiptJournal(undefined, (report) => {
  new File(Paths.document, `${runId}.json`).write(
    JSON.stringify({ ...environment, ...report }),
  );
});

export function startReceiptMeasurement(source: "camera" | "library") {
  if (__DEV__) return journal.start(source);
}

export function receiptMeasurements() {
  return { ...environment, ...journal.snapshot() };
}

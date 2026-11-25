import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import {
  MAX_RECEIPT_BYTES,
  receiptMetadataSchema,
  type ReceiptResult,
} from "@chagok/contracts/receipts";
import { storage } from "../auth/storage";
import { webOrigin } from "../lib/trpc";
import { selectReceipt } from "./picker";
import { uploadReceipt } from "./upload";
import type { ReceiptTrace } from "./metrics";

export async function pickAndUploadReceipt(
  source: "camera" | "library",
  companyId: string,
  signal: AbortSignal,
  trace?: ReceiptTrace,
): Promise<ReceiptResult> {
  const pick = () =>
    selectReceipt(source, signal, {
      permission: ImagePicker.requestCameraPermissionsAsync,

      launch(source) {
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          allowsEditing: false,
          quality: 1,
          exif: false,
          base64: false,
        };
        return source === "camera"
          ? ImagePicker.launchCameraAsync(options)
          : ImagePicker.launchImageLibraryAsync(options);
      },
    });

  const asset = await (trace ? trace.measure("pickerMs", pick) : pick());
  if (!asset) return { kind: "cancelled" };
  signal.throwIfAborted();

  const prepare = () => {
    const file = new File(asset.uri);
    if (file.size > MAX_RECEIPT_BYTES) throw { code: "TOO_LARGE" };
    const metadata = receiptMetadataSchema.safeParse({
      mimeType: asset.mimeType || file.type,
      byteSize: file.size,
    });
    if (!metadata.success) throw { code: "UNSUPPORTED" };
    return { file, metadata: metadata.data };
  };

  const { file, metadata } = await (trace
    ? trace.measure("prepareMs", prepare)
    : prepare());
  trace?.metadata(metadata);

  const upload = () =>
    uploadReceipt(file, metadata, companyId, signal, {
      origin: webOrigin,

      token: () => storage.get(),

      fetch,
    });

  const receipt = await (trace ? trace.measure("uploadMs", upload) : upload());
  return { kind: "uploaded", receipt };
}

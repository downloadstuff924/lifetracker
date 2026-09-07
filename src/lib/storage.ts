import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "./firebase";
import type { TaskImage } from "@/types/models";
export function validateImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Each image must be smaller than 10 MB.");
}
export async function uploadImage(
  uid: string,
  taskId: string,
  file: File,
  progress: (value: number) => void,
): Promise<TaskImage> {
  validateImage(file);
  const storagePath = `users/${uid}/tasks/${taskId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const upload = uploadBytesResumable(ref(storage, storagePath), file);
  await new Promise<void>((resolve, reject) =>
    upload.on(
      "state_changed",
      (s) => progress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject,
      resolve,
    ),
  );
  return {
    storagePath,
    fileName: file.name,
    url: await getDownloadURL(upload.snapshot.ref),
  };
}
export async function removeImage(image: TaskImage) {
  try {
    await deleteObject(ref(storage, image.storagePath));
  } catch (error) {
    if ((error as { code?: string }).code !== "storage/object-not-found")
      throw error;
  }
}

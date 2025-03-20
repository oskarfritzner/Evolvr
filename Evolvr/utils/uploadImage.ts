import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(blob: Blob, path: string): Promise<string> {
  const storage = getStorage();
  const imageRef = ref(storage, path);
  await uploadBytes(imageRef, blob);
  return getDownloadURL(imageRef);
}

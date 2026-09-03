import { UTApi } from "uploadthing/server";

export async function deleteUploadThingFile(fileKey: string | null | undefined) {
  if (!fileKey || !process.env.UPLOADTHING_TOKEN) return;

  try {
    await new UTApi().deleteFiles(fileKey);
  } catch (error) {
    console.error("Failed to delete UploadThing file", error);
  }
}

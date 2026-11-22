import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/lib/rbac";

const f = createUploadthing();
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac"]);

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UploadThingError("Authentication required");
  return user;
}

export const ourFileRouter = {
  avatarUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (!ALLOWED_IMAGE_TYPES.has(files[0]?.type ?? "")) {
        throw new UploadThingError("Only JPG, PNG, or WebP images are allowed");
      }
      if (files[0]?.size > 5 * 1024 * 1024) {
        throw new UploadThingError("Image is too large. Keep it under 5MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  studioLogoUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ORGANIZER") throw new UploadThingError("Organizer access required");
      if (!ALLOWED_IMAGE_TYPES.has(files[0]?.type ?? "")) {
        throw new UploadThingError("Only JPG, PNG, or WebP images are allowed");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  eventPosterUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ORGANIZER") throw new UploadThingError("Organizer access required");
      if (files[0]?.size > 1.5 * 1024 * 1024) {
        throw new UploadThingError("Image is too large. Keep it under 1.5MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  judgePhotoUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ORGANIZER") throw new UploadThingError("Organizer access required");
      if (!ALLOWED_IMAGE_TYPES.has(files[0]?.type ?? "")) {
        throw new UploadThingError("Only JPG, PNG, or WebP images are allowed");
      }
      if (files[0]?.size > 3.5 * 1024 * 1024) {
        throw new UploadThingError("Image is too large. Keep it under 3.5MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  eventPhotoUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 6 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ORGANIZER") throw new UploadThingError("Organizer access required");
      const invalid = files.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
      if (invalid) {
        throw new UploadThingError("Only JPG, PNG, or WebP images are allowed");
      }
      const oversized = files.some((file) => file.size > 3.5 * 1024 * 1024);
      if (oversized) {
        throw new UploadThingError("Images are too large. Keep each under 3.5MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  galleryImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ADMIN") throw new UploadThingError("Admin access required");
      const oversized = files.some((file) => file.size > 5 * 1024 * 1024);
      if (oversized) {
        throw new UploadThingError("Images are too large. Keep each under 5MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
    })),

  registrationMusicUploader: f({ audio: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const user = await requireUser();
      if (user.role !== "ARTIST") throw new UploadThingError("Artist access required");
      const file = files[0];
      if (!file) throw new UploadThingError("Music file is required");
      if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
        throw new UploadThingError("Only MP3, WAV, M4A, or AAC audio files are allowed");
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new UploadThingError("Audio is too large. Keep it under 20MB");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      userId: metadata.userId,
      fileKey: file.key,
      fileUrl: file.ufsUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/lib/rbac";

const f = createUploadthing();
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

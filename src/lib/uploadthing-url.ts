const UPLOADTHING_HOSTS = new Set(["ufs.sh", "utfs.io", "uploadthing.com"]);

export function isUploadThingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      UPLOADTHING_HOSTS.has(url.hostname) ||
      [...UPLOADTHING_HOSTS].some((host) => url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

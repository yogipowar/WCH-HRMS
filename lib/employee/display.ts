import type { Employee, Gender } from "@/types";

export function employeeSalutation(gender: Gender | null | undefined): string {
  if (gender === "MALE") return "Mr.";
  if (gender === "FEMALE") return "Mrs.";
  return "";
}

export function formatEmployeeDisplayName(
  fullName: string,
  gender?: Gender | null,
): string {
  const name = fullName.trim();
  const title = employeeSalutation(gender);
  return title ? `${title} ${name}` : name;
}

export function defaultAvatarForGender(gender?: Gender | null): string {
  if (gender === "MALE") return "/avatars/default-male.svg";
  if (gender === "FEMALE") return "/avatars/default-female.svg";
  return "/avatars/default-neutral.svg";
}

export function resolveEmployeeAvatarUrl(
  employee: Pick<Employee, "avatarUrl" | "gender"> | null | undefined,
): string {
  if (employee?.avatarUrl) return employee.avatarUrl;
  return defaultAvatarForGender(employee?.gender);
}

/** Compress an image file to a JPEG data URL suitable for avatar_url TEXT storage. */
export async function fileToAvatarDataUrl(file: File, maxSize = 480): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or WebP).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be under 8 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image."));
    image.src = src;
  });
}

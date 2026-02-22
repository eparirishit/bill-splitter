import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageSizeKB(dataUri: string): number {
  // Remove data URI prefix and calculate size
  const base64Data = dataUri.split(",")[1];
  return (base64Data.length * 0.75) / 1024;
}

export function validateImageSize(
  dataUri: string,
  maxSizeKB: number = 3072
): void {
  const sizeKB = getImageSizeKB(dataUri);
  if (sizeKB > maxSizeKB) {
    throw new Error(
      `Image too large (${sizeKB.toFixed(1)}KB). Please use an image smaller than ${maxSizeKB}KB.`
    );
  }
}

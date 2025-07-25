import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Image compression utilities for client-side use
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    maxSizeKB = 2048, // 2MB target
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to meet size requirement
        let currentQuality = quality;
        let dataUri: string;

        do {
          dataUri = canvas.toDataURL("image/jpeg", currentQuality);
          const sizeKB = (dataUri.length * 0.75) / 1024; // Approximate size in KB

          if (sizeKB <= maxSizeKB || currentQuality <= 0.1) {
            break;
          }

          currentQuality -= 0.1;
        } while (currentQuality > 0.1);

        resolve(dataUri);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
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

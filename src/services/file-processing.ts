import { compressImage, getImageSizeKB } from "@/lib/utils";

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ImageProcessingResult {
  success: boolean;
  dataUri?: string;
  error?: string;
  sizeKB?: number;
}

export class FileProcessingService {
  private static readonly MAX_FILE_SIZE_MB = 10;
  private static readonly MAX_FILE_SIZE_BYTES = FileProcessingService.MAX_FILE_SIZE_MB * 1024 * 1024;
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  static validateFile(file: File): FileValidationResult {
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit.`
      };
    }

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: "Please select an image file (JPG, PNG, WEBP, HEIC)."
      };
    }

    return { isValid: true };
  }

  static async processImage(file: File): Promise<ImageProcessingResult> {
    try {
      const compressedDataUri = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        maxSizeKB: 2048
      });

      const sizeKB = getImageSizeKB(compressedDataUri);
      console.log(`Image compressed to ${sizeKB.toFixed(1)}KB`);

      return {
        success: true,
        dataUri: compressedDataUri,
        sizeKB
      };
    } catch (compressionError) {
      console.error('Image compression failed:', compressionError);
      
      // Fallback to original file
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          const sizeKB = getImageSizeKB(dataUri);
          resolve({
            success: true,
            dataUri,
            sizeKB
          });
        };
        reader.readAsDataURL(file);
      });
    }
  }
} 

export interface FileValidationResult {
  isValid: boolean;
  error?: string | null;
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
  private static readonly MIN_FILE_SIZE_BYTES = 1024; // 1KB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  static validateFile(file: File): FileValidationResult {
    if (file.size < this.MIN_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'File size must be at least 1KB'
      };
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'File size must be less than 10MB'
      };
    }

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Please select a valid image file (JPEG, PNG, or WebP)'
      };
    }

    return { isValid: true, error: null };
  }

  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  static isValidImageType(mimeType: string): boolean {
    return this.ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  static async processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Calculate new dimensions while maintaining aspect ratio
            const maxWidth = 2048;
            const maxHeight = 2048;
            let { width, height } = img;

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // Enable high-quality rendering for better text recognition
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to data URI
            const dataUri = canvas.toDataURL('image/jpeg', 0.9);
            resolve(dataUri);
          } catch (error) {
            reject(new Error('Failed to process image'));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = reader.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
} 
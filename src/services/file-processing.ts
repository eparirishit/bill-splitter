import { AI_CONFIG } from '@/lib/config';

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
  private static readonly MIN_FILE_SIZE_BYTES = 1024; // 1KB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  private static readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

  /**
   * Get the maximum file size in bytes from configuration
   */
  private static getMaxFileSizeBytes(): number {
    return AI_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  static validateFile(file: File): FileValidationResult {
    if (file.size < this.MIN_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'File size must be at least 1KB'
      };
    }

    const maxFileSizeBytes = this.getMaxFileSizeBytes();
    if (file.size > maxFileSizeBytes) {
      const fileSizeFormatted = this.formatFileSize(file.size);
      const maxSizeFormatted = this.formatFileSize(maxFileSizeBytes);
      return {
        isValid: false,
        error: `File size (${fileSizeFormatted}) exceeds the maximum allowed size of ${maxSizeFormatted}. Please use a smaller image.`
      };
    }

    // Validate MIME type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const fileExtension = this.getFileExtension(file.name).toLowerCase();
      if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return {
          isValid: false,
          error: 'Please select a JPG or PNG file.'
        };
      }
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
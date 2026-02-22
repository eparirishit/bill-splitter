import { AI_CONFIG } from '@/lib/config';

export interface FileValidationResult {
  isValid: boolean;
  error?: string | null;
}

export class FileProcessingService {
  private static readonly MIN_FILE_SIZE_BYTES = 1024; // 1KB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  private static readonly ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  private static readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];

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

    // Validate MIME type and extension
    const fileExtension = this.getFileExtension(file.name).toLowerCase();
    const isAllowedMimeType = this.ALLOWED_FILE_TYPES.includes(file.type);
    const isAllowedExtension = this.ALLOWED_EXTENSIONS.includes(fileExtension);

    if (!isAllowedMimeType && !isAllowedExtension) {
      return {
        isValid: false,
        error: 'Please select a JPG, PNG, or PDF file.'
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
}
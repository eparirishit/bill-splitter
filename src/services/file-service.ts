import { compressImage, getImageSizeKB } from '@/lib/utils';

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

export class FileService {
    static readonly MAX_FILE_SIZE_MB = 10;
    static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

    /**
     * Validate uploaded file
     */
    static validateFile(file: File): FileValidationResult {
        if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
            return {
                isValid: false,
                error: `File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit.`
            };
        }

        if (!file.type.startsWith("image/")) {
            return {
                isValid: false,
                error: "Please select an image file (JPG, PNG, WEBP, HEIC)."
            };
        }

        return { isValid: true };
    }

    /**
     * Process and compress image file
     */
    static async processImageFile(file: File): Promise<string> {
        try {
            const compressedDataUri = await compressImage(file, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.8,
                maxSizeKB: 2048
            });

            console.log(`Image compressed to ${getImageSizeKB(compressedDataUri).toFixed(1)}KB`);
            return compressedDataUri;
        } catch (compressionError) {
            console.error('Image compression failed:', compressionError);

            // Fallback to original file
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    }

    /**
     * Handle file selection with validation and processing
     */
    static async handleFileSelection(file: File): Promise<{
        success: boolean;
        previewUrl?: string;
        error?: string;
    }> {
        const validation = this.validateFile(file);

        if (!validation.isValid) {
            return {
                success: false,
                error: validation.error
            };
        }

        try {
            const previewUrl = await this.processImageFile(file);
            return {
                success: true,
                previewUrl
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to process image file.'
            };
        }
    }
}

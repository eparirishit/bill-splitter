import { extractReceiptData } from '@/ai/extract-receipt-data';
import { useBillSplitting } from '@/contexts/bill-splitting-context';
import { uploadImageToStorage, generateImageHash } from '@/lib/supabase';
import { AnalyticsClientService } from '@/services/analytics-client';
import { FileProcessingService, type FileValidationResult } from '@/services/file-processing';
import type { ExtractReceiptDataOutput } from '@/types';
import { useRef, useState } from 'react';

interface UseFileUploadReturn {
  selectedFile: File | null;
  previewUrl: string | null;
  error: string | null;
  isLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => Promise<{ data: ExtractReceiptDataOutput; receiptId?: string } | null>;
  clearFile: () => void;
}

export function useFileUpload(
  onDataExtracted: (data: ExtractReceiptDataOutput) => void,
  onLoadingChange: (isLoading: boolean) => void,
  userId?: string
): UseFileUploadReturn {
  const { setLastUploadedFile } = useBillSplitting();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    
    if (!file) {
      clearFile();
      return;
    }

    // Validate file
    const validation: FileValidationResult = FileProcessingService.validateFile(file);
    if (!validation.isValid) {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError(validation.error!);
      return;
    }

    setSelectedFile(file);
    
    // Only process and preview image files (skip PDFs)
    if (FileProcessingService.isValidImageType(file.type)) {
      FileProcessingService.processImage(file).then((dataUri: string) => {
        setPreviewUrl(dataUri);
      }).catch((error) => {
        console.error('Image processing error:', error);
        setError('Failed to process image');
        clearFile();
      });
    } else {
      // For non-image files like PDFs, we allow upload but don't generate a preview
      setPreviewUrl(null);
    }
  };

  const handleUpload = async (): Promise<{ data: ExtractReceiptDataOutput; receiptId?: string } | null> => {
    if (!selectedFile) {
      setError("No file selected");
      return null;
    }

    setIsLoading(true);
    onLoadingChange(true);
    setError(null);

    const startTime = Date.now();

    try {
      // Upload image to Supabase storage first
      let imageUrl: string | undefined;
      
      if (!userId) {
        throw new Error("User authentication required. Please log in to upload images.");
      }

      try {
        const { url } = await uploadImageToStorage(selectedFile, userId);
        imageUrl = url;
        console.log("Image uploaded to Supabase storage:", imageUrl);
      } catch (uploadError) {
        console.error("Failed to upload to storage:", uploadError);
        throw new Error(
          `Failed to upload image to storage: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}. ` +
          `Please try again or use a smaller image.`
        );
      }

      // Always use storage URL - never fall back to data URI to avoid 1MB Server Actions limit
      if (!imageUrl) {
        throw new Error("Failed to get image URL from storage");
      }

      // Persist basic file info so the upload UI can be restored when navigating back
      setLastUploadedFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        url: imageUrl,
      });

      const extractionInput = { imageUrl };

      const result = await extractReceiptData(extractionInput, userId);
      console.log("Extraction Result:", result);

      // Basic validation of result structure
      if (!result || typeof result !== 'object' || !Array.isArray(result.items) || typeof result.totalCost !== 'number') {
        throw new Error("Received invalid data structure from extraction.");
      }

      // Convert null values to undefined to match ExtractReceiptDataOutput type
      const processedResult: ExtractReceiptDataOutput = {
        storeName: result.storeName,
        date: result.date,
        items: result.items,
        totalCost: result.totalCost,
        taxes: result.taxes === null ? undefined : result.taxes,
        otherCharges: result.otherCharges === null ? undefined : result.otherCharges,
        discount: result.discount === null ? undefined : result.discount,
        discrepancyFlag: result.discrepancyFlag,
        discrepancyMessage: result.discrepancyMessage,
      };

      // Track receipt processing for analytics
      let receiptId: string | undefined;
      if (userId && selectedFile) {
        const processingTimeMs = Date.now() - startTime;
        // Generate image hash for tracking
        const imageHash = await generateImageHash(selectedFile);
        
        receiptId = await AnalyticsClientService.trackReceiptProcessing({
          userId,
          aiExtraction: processedResult,
          processingTimeMs,
          aiModelVersion: result.aiMetadata?.modelName || 'unknown',
          aiProvider: result.aiMetadata?.provider,
          aiModelName: result.aiMetadata?.modelName,
          aiTokensUsed: result.aiMetadata?.tokensUsed,
          aiProcessingTimeMs: result.aiMetadata?.processingTimeMs,
          existingImageUrl: imageUrl,
          existingImageHash: imageHash,
          originalFilename: selectedFile.name,
          fileSize: selectedFile.size,
        });
        
        if (receiptId) {
          console.log('Receipt processing tracked with ID:', receiptId);
        }
      }

      onDataExtracted(processedResult);
      return { data: processedResult, receiptId };
    } catch (err: any) {
      console.error("Error extracting data:", err);
      let userMessage = "Failed to extract data from the bill. Please try again or use a clearer image.";
      
      if (err.message === "Received invalid data structure from extraction.") {
        userMessage = "Could not understand the bill structure. Please ensure it's a clear image.";
      } else if (err.message && err.message.includes("timeout")) {
        userMessage = "The request timed out. Please try again.";
      }
      
      setError(userMessage);
      return null;
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  };

  return {
    selectedFile,
    previewUrl,
    error,
    isLoading,
    fileInputRef,
    handleFileChange,
    handleUpload,
    clearFile
  };
} 
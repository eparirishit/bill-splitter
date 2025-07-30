import { extractReceiptData } from '@/ai/extract-receipt-data';
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
  handleUpload: () => Promise<ExtractReceiptDataOutput | null>;
  clearFile: () => void;
}

export function useFileUpload(
  onDataExtracted: (data: ExtractReceiptDataOutput) => void,
  onLoadingChange: (isLoading: boolean) => void
): UseFileUploadReturn {
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
      setError(validation.error!);
      clearFile();
      return;
    }

    setSelectedFile(file);
    
    // Process image
    FileProcessingService.processImage(file).then((dataUri: string) => {
      setPreviewUrl(dataUri);
    }).catch((error) => {
      console.error('Image processing error:', error);
      setError('Failed to process image');
      clearFile();
    });
  };

  const handleUpload = async (): Promise<ExtractReceiptDataOutput | null> => {
    if (!selectedFile || !previewUrl) {
      setError("No file selected");
      return null;
    }

    setIsLoading(true);
    onLoadingChange(true);
    setError(null);

    try {
      const result = await extractReceiptData({ photoDataUri: previewUrl });
      console.log("Extraction Result:", result);

      // Basic validation of result structure
      if (!result || typeof result !== 'object' || !Array.isArray(result.items) || typeof result.totalCost !== 'number') {
        throw new Error("Received invalid data structure from extraction.");
      }

      // Convert null values to undefined to match ExtractReceiptDataOutput type
      const processedResult: ExtractReceiptDataOutput = {
        ...result,
        taxes: result.taxes === null ? undefined : result.taxes,
        otherCharges: result.otherCharges === null ? undefined : result.otherCharges,
        discount: result.discount === null ? undefined : result.discount
      };

      onDataExtracted(processedResult);
      return processedResult;
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
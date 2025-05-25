"use client";

import * as React from "react";
import { Upload, Loader2, AlertTriangle, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractReceiptData } from "@/ai/extract-receipt-data";
import type { ExtractReceiptDataOutput } from "@/types";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  onDataExtracted: (data: ExtractReceiptDataOutput) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
}

export function UploadStep({ onDataExtracted, onLoadingChange, isLoading }: UploadStepProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Reset error on new file selection
    const file = event.target.files?.[0];
    if (file) {
      // Simple size check (e.g., 10MB) - Increased limit slightly
      if (file.size > 10 * 1024 * 1024) {
          setError("File size exceeds 10MB limit.");
          setSelectedFile(null);
          setPreviewUrl(null);
           if (fileInputRef.current) {
              fileInputRef.current.value = "";
           }
          return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPG, PNG, WEBP, HEIC).");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset input field
        }
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) {
      toast({
        title: "No File Selected",
        description: "Please select a bill image.",
        variant: "destructive",
      });
      return;
    }

    onLoadingChange(true);
    setError(null);

    try {
      const result = await extractReceiptData({ photoDataUri: previewUrl });
      console.log("Extraction Result:", result); // Log for debugging

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
      toast({
        title: "Extraction Complete",
        description: "Bill data processed successfully.",
        variant: 'default' // Use default or success variant
      });
       // No need to set loading false here, page transition handles it
    } catch (err: any) {
      console.error("Error extracting data:", err);
      let userMessage = "Failed to extract data from the bill. Please try again or use a clearer image.";
      if (err.message === "Received invalid data structure from extraction.") {
          userMessage = "Could not understand the bill structure. Please ensure it's a clear image.";
      } else if (err.message && err.message.includes("timeout")) {
          userMessage = "The request timed out. Please try again.";
      }
      setError(userMessage);
      toast({
        title: "Extraction Failed",
        description: userMessage,
        variant: "destructive",
      });
      onLoadingChange(false); // Set loading false only on error
    }
    // No finally block setting loading false, as success triggers navigation
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  }

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
        {/* Step Title */}
        <div className="px-1">
          <h2 className="text-2xl font-semibold mb-1">Upload Receipt</h2>
          <p className="text-muted-foreground text-sm">Take a photo or upload an image of your bill.</p>
        </div>

        {/* Upload Area with proper spacing */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-1 pb-20">
             <Label
                  htmlFor="dropzone-file"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ease-in-out",
                    previewUrl ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/60",
                    error ? "border-destructive bg-destructive/5" : "" // Error state styling
                   )}
              >
                  {previewUrl ? (
                      <img src={previewUrl} alt="Bill preview" className="object-contain h-full w-full rounded-lg p-1" />
                  ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                          <ImagePlus className="w-12 h-12 mb-3 text-muted-foreground" strokeWidth={1.5} />
                          <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Tap to upload</span></p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, HEIC (Max 10MB)</p>
                      </div>
                  )}
                  <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*,.heic,.heif" ref={fileInputRef} disabled={isLoading} />
              </Label>
              {selectedFile && !previewUrl && !isLoading && ( // Show file name if preview isn't ready
                  <p className="text-sm text-muted-foreground mt-2 text-center">Selected: {selectedFile.name}</p>
              )}

              {error && (
                <div className="w-full flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mt-3">
                 <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                 <span>{error}</span>
               </div>
             )}
        </div>

         {/* Sticky Footer Button - Fixed positioning */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
            <div className="max-w-md mx-auto">
                <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isLoading}
                    className="w-full tap-scale"
                    size="lg"
                >
                    {isLoading ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                     </>
                    ) : (
                      <>
                       <Upload className="mr-2 h-5 w-5" /> Extract Bill Data
                      </>
                    )}
                </Button>
            </div>
       </div>
    </div>
  );
}

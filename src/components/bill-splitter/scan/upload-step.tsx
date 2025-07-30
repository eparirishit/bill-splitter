"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ExtractReceiptDataOutput } from "@/types";
import { AlertTriangle, ArrowLeft, ImagePlus, Loader2, Upload } from "lucide-react";
import * as React from "react";

interface UploadStepProps {
  onDataExtracted: (data: ExtractReceiptDataOutput) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack?: () => void;
}

export function UploadStep({ onDataExtracted, onLoadingChange, isLoading, onBack }: UploadStepProps) {
  const { toast } = useToast();
  const {
    selectedFile,
    previewUrl,
    error,
    isLoading: fileUploadLoading,
    fileInputRef,
    handleFileChange,
    handleUpload,
    clearFile
  } = useFileUpload(onDataExtracted, onLoadingChange);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event);
  };

  const onUpload = async () => {
    const result = await handleUpload();
    if (result) {
      toast({
        title: "Extraction Complete",
        description: "Bill data processed successfully. Please review the extracted information for accuracy.",
        variant: 'default'
      });
    } else {
      toast({
        title: "Extraction Failed",
        description: error || "Failed to extract data from the bill. Please try again or use a clearer image.",
        variant: "destructive",
      });
    }
  };

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
                    error ? "border-destructive bg-destructive/5" : ""
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
                  <Input id="dropzone-file" type="file" className="hidden" onChange={onFileChange} accept="image/*,.heic,.heif" ref={fileInputRef} disabled={isLoading} />
              </Label>
              {selectedFile && !previewUrl && !isLoading && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">Selected: {selectedFile.name}</p>
              )}

              {error && (
                <div className="w-full flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mt-3">
                 <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                 <span>{error}</span>
               </div>
             )}
        </div>

         {/* Sticky Footer Button */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 mt-auto">
            <div className="max-w-md mx-auto">
                {onBack ? (
                  <div className="flex gap-3">
                    <Button onClick={onBack} variant="outline" disabled={isLoading} className="w-1/3 hover:bg-primary/10 hover:text-primary">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                        onClick={onUpload}
                        disabled={!selectedFile || isLoading || fileUploadLoading}
                        className="w-2/3 tap-scale"
                        size="lg"
                    >
                        {(isLoading || fileUploadLoading) ? (
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
                ) : (
                  <Button
                      onClick={onUpload}
                      disabled={!selectedFile || isLoading || fileUploadLoading}
                      className="w-full tap-scale"
                      size="lg"
                  >
                      {(isLoading || fileUploadLoading) ? (
                       <>
                         <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                       </>
                      ) : (
                        <>
                         <Upload className="mr-2 h-5 w-5" /> Extract Bill Data
                        </>
                      )}
                  </Button>
                )}
            </div>
       </div>
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBillSplitting } from "@/contexts/bill-splitting-context";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import { AI_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ExtractReceiptDataOutput } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import * as React from "react";

interface UploadStepProps {
  onDataExtracted: (data: ExtractReceiptDataOutput, receiptId?: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  isLoading: boolean;
  onBack?: () => void;
  userId?: string;
}

export function UploadStep({ onDataExtracted, onLoadingChange, isLoading, onBack, userId }: UploadStepProps) {
  const { toast } = useToast();
  const { lastUploadedFile, setLastUploadedFile } = useBillSplitting();
  const {
    selectedFile,
    previewUrl,
    error,
    isLoading: fileUploadLoading,
    fileInputRef,
    handleFileChange,
    handleUpload,
    clearFile
  } = useFileUpload(onDataExtracted, onLoadingChange, userId);
  const fileDisplay = selectedFile ?? lastUploadedFile ?? null;

  const isPdf =
    !!fileDisplay &&
    (fileDisplay.type === "application/pdf" ||
      fileDisplay.name.toLowerCase().endsWith(".pdf"));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Show toast notification for file validation errors
  React.useEffect(() => {
    if (error) {
      if (error.includes('exceeds the maximum')) {
        toast({
          title: "File Too Large",
          description: error,
          variant: "destructive",
        });
      } else if (error.includes('JPG, PNG, or PDF')) {
        toast({
          title: "Invalid File Type",
          description: error,
          variant: "destructive",
        });
      }
    }
  }, [error, toast]);

  const handleViewFile = React.useCallback(() => {
    if (selectedFile) {
      try {
        const objectUrl = URL.createObjectURL(selectedFile);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        // Revoke the object URL after the new tab has had time to load
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      } catch (viewError) {
        console.error("Failed to open file preview:", viewError);
        toast({
          title: "Unable to open file",
          description: "We couldn't open a preview for this file.",
          variant: "destructive",
        });
        return;
      }
    }

    if (lastUploadedFile?.url) {
      try {
        window.open(lastUploadedFile.url, "_blank", "noopener,noreferrer");
      } catch (viewError) {
        console.error("Failed to open uploaded file URL:", viewError);
        toast({
          title: "Unable to open file",
          description: "We couldn't open the uploaded file.",
          variant: "destructive",
        });
      }
    }
  }, [lastUploadedFile, selectedFile, toast]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event);
  };

  const onUpload = async () => {
    const result = await handleUpload();
    if (result) {
      // Call onDataExtracted with both data and receiptId
      onDataExtracted(result.data, result.receiptId);
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
          <p className="text-muted-foreground text-sm">Take a photo, upload an image, or upload a PDF of your bill.</p>
        </div>

        {/* Upload Area with proper spacing */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-1 pb-20">
             <Label
                  htmlFor="dropzone-file"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ease-in-out",
                    (previewUrl || fileDisplay)
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/60",
                    error ? "border-destructive bg-destructive/5" : ""
                   )}
              >
                  {previewUrl ? (
                      <img src={previewUrl} alt="Bill preview" className="object-contain h-full w-full rounded-lg p-1" />
                  ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                          <ImagePlus className="w-12 h-12 mb-3 text-muted-foreground" strokeWidth={1.5} />
                          <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Tap to upload</span></p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, or PDF (Max {AI_CONFIG.MAX_FILE_SIZE_MB}MB)</p>
                      </div>
                  )}
                  <Input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    onChange={onFileChange}
                    accept="image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                    ref={fileInputRef}
                    disabled={isLoading}
                  />
              </Label>
              {fileDisplay && (
                <div className="w-full mt-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary">
                        {isPdf ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fileDisplay.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isPdf ? "PDF document" : "Image file"} •{" "}
                          {formatFileSize(fileDisplay.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPdf && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-transparent"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleViewFile();
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-transparent"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearFile();
                          setLastUploadedFile(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
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
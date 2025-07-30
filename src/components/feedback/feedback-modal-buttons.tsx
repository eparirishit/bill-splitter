"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AnalyticsService } from "../../lib/analytics";

// Helper function to generate a UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  receiptId?: string;
}

export function FeedbackModal({ isOpen, onClose, userId, receiptId }: FeedbackModalProps) {
  const [selectedRating, setSelectedRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedRating || !userId) return;

    setIsSubmitting(true);
    try {
      console.log('Submitting feedback:', { rating: selectedRating, userId, receiptId });
      
      // Generate a proper UUID for the receipt if not provided
      const actualReceiptId = receiptId && receiptId !== 'temp-receipt-id' 
        ? receiptId 
        : generateUUID();
      
      await AnalyticsService.submitFeedback(
        actualReceiptId,
        userId,
        { overall_accuracy: selectedRating }
      );

      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve our AI accuracy.",
        variant: "default"
      });
      
      onClose();
    } catch (error) {
      console.warn('Failed to submit feedback:', error);
      // Don't show error toast for analytics failures
      // Just log it and continue with success flow
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedRating(null);
      onClose();
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedRating(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">How was the AI extraction?</DialogTitle>
          <DialogDescription className="text-center">
            Help us improve our receipt scanning accuracy
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Rating Selection with Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              onClick={() => setSelectedRating('thumbs_up')}
              variant={selectedRating === 'thumbs_up' ? 'default' : 'outline'}
              size="lg"
              className="flex-1 flex items-center gap-2 h-16 text-lg hover:bg-primary/10"
              disabled={isSubmitting}
            >
              <ThumbsUp className="h-6 w-6" />
              Accurate
            </Button>
            
            <Button
              onClick={() => setSelectedRating('thumbs_down')}
              variant={selectedRating === 'thumbs_down' ? 'default' : 'outline'}
              size="lg"
              className="flex-1 flex items-center gap-2 h-16 text-lg hover:bg-primary/10"
              disabled={isSubmitting}
            >
              <ThumbsDown className="h-6 w-6" />
              Inaccurate
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>

          {/* Skip Button */}
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
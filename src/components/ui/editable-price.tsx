"use client";

import * as React from "react";
import { Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, parseCurrency, validateCurrencyAmount } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface EditablePriceProps {
  value: number;
  onValueChange: (value: number) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showEditIcon?: boolean;
  errorMessage?: string;
}

export function EditablePrice({ 
  value, 
  onValueChange, 
  onEditStart,
  onEditEnd,
  disabled = false,
  className,
  placeholder = "0.00",
  showEditIcon = true,
  errorMessage = "Please enter a valid price greater than or equal to 0."
}: EditablePriceProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState<string>("");
  const { toast } = useToast();

  const handleEditStart = () => {
    if (disabled) {return;}
    
    setIsEditing(true);
    setEditValue(value.toFixed(2));
    onEditStart?.();
  };

  const handleEditEnd = () => {
    const trimmedValue = editValue.trim();
    const parsedValue = parseCurrency(trimmedValue);
    
    if (!validateCurrencyAmount(parsedValue)) {
      toast({
        title: "Invalid Price",
        description: errorMessage,
        variant: "destructive",
      });
      setEditValue(value.toFixed(2));
      setIsEditing(false);
      onEditEnd?.();
      return;
    }

    if (parsedValue !== value) {
      onValueChange(parsedValue);
    }
    
    setIsEditing(false);
    onEditEnd?.();
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      (event.currentTarget as HTMLInputElement).blur();
    }
    if (event.key === 'Escape') {
      setEditValue(value.toFixed(2));
      setIsEditing(false);
      onEditEnd?.();
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(event.target.value);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span 
        className={cn(
          "text-sm font-semibold px-2 py-1 rounded cursor-pointer transition-colors",
          isEditing 
            ? "bg-blue-50 text-blue-700 border border-blue-200" 
            : disabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        )}
        onClick={handleEditStart}
      >
        {isEditing ? (
          <input
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleEditEnd}
            onKeyDown={handleKeyPress}
            onFocus={handleFocus}
            className="w-16 text-sm font-semibold text-blue-700 bg-transparent border-0 outline-none text-center"
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          formatCurrency(value)
        )}
      </span>
      {showEditIcon && !disabled && (
        <Edit3 className={cn(
          "h-3 w-3 text-gray-400 transition-opacity",
          isEditing ? "opacity-100" : "opacity-60 hover:opacity-100"
        )} />
      )}
    </div>
  );
}

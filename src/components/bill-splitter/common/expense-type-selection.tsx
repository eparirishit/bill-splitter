"use client";

import * as React from "react";
import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpenseTypeSelectionProps {
  onTypeSelect: (type: 'scan' | 'manual') => void;
}

export function ExpenseTypeSelection({ onTypeSelect }: ExpenseTypeSelectionProps) {
  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in pt-2">
      {/* Header */}
      <div className="px-1 text-center">
        <h1 className="text-3xl font-bold mb-2">Split Expenses</h1>
        <p className="text-muted-foreground">Choose how you'd like to add your expense</p>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center space-y-4 px-1 pb-20">
        <Card 
          className="card-modern cursor-pointer transition-all duration-200 hover:scale-[1.02] tap-scale" 
          onClick={() => onTypeSelect('scan')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Scan Receipt</CardTitle>
            <CardDescription className="text-sm">
              Upload a photo of your receipt and let AI extract the items automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Scan Receipt
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="card-modern cursor-pointer transition-all duration-200 hover:scale-[1.02] tap-scale" 
          onClick={() => onTypeSelect('manual')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Add Expense</CardTitle>
            <CardDescription className="text-sm">
              Manually enter expense details and split among group members
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Expense
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

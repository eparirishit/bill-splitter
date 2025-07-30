import { ExpenseValidationService, type ValidationResult } from '@/services/expense-validation';
import type { ManualExpenseData, SplitwiseUser } from '@/types';
import { useState } from 'react';

interface UseExpenseFormReturn {
  title: string;
  amount: string;
  notes: string;
  date: string;
  errors: string[];
  setTitle: (title: string) => void;
  setAmount: (amount: string) => void;
  setNotes: (notes: string) => void;
  setDate: (date: string) => void;
  validateAndSubmit: (selectedMembers: SplitwiseUser[], groupId: string) => ManualExpenseData | null;
  clearErrors: () => void;
}

export function useExpenseForm(): UseExpenseFormReturn {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [errors, setErrors] = useState<string[]>([]);

  const clearErrors = () => {
    setErrors([]);
  };

  const validateAndSubmit = (selectedMembers: SplitwiseUser[], groupId: string): ManualExpenseData | null => {
    const validation: ValidationResult = ExpenseValidationService.validateExpenseDetails({
      title,
      amount,
      date,
      members: selectedMembers
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return null;
    }

    const parsedAmount = parseFloat(amount);
    const expenseData: ManualExpenseData = {
      title: title.trim(),
      amount: parsedAmount,
      date,
      groupId,
      members: selectedMembers,
      splitType: 'equal',
      notes: notes.trim() || undefined
    };

    clearErrors();
    return expenseData;
  };

  return {
    title,
    amount,
    notes,
    date,
    errors,
    setTitle,
    setAmount,
    setNotes,
    setDate,
    validateAndSubmit,
    clearErrors
  };
} 
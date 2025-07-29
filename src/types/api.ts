export interface SplitWiseAPIError {
  errors: {
    base?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface APIResponse<T = unknown> {
  data?: T;
  errors?: SplitWiseAPIError['errors'];
  success?: boolean;
}

export interface CreateExpenseResponse extends APIResponse {
  expense?: {
    id: number;
    description: string;
    cost: string;
    currency_code: string;
    date: string;
    // Add other expense fields as needed
  };
}

export type APIResult<T = unknown> = T | SplitWiseAPIError;

export function isAPIError(result: unknown): result is SplitWiseAPIError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'errors' in result &&
    typeof (result as SplitWiseAPIError).errors === 'object'
  );
}

export function getErrorMessage(error: SplitWiseAPIError): string {
  const errorMessages: string[] = [];
  
  if (error.errors.base && Array.isArray(error.errors.base)) {
    errorMessages.push(...error.errors.base);
  }
  
  // Handle other error types
  Object.entries(error.errors).forEach(([key, value]) => {
    if (key !== 'base' && Array.isArray(value)) {
      errorMessages.push(...value);
    }
  });
  
  return errorMessages.length > 0 ? errorMessages.join('; ') : 'An unknown error occurred';
}

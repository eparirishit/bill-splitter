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
  // More specific error detection - only consider it an error if it has the errors property with actual errors
  return (
    typeof result === 'object' &&
    result !== null &&
    'errors' in result &&
    typeof (result as SplitWiseAPIError).errors === 'object' &&
    (result as SplitWiseAPIError).errors !== null &&
    // Check if there are actual error messages
    Object.keys((result as SplitWiseAPIError).errors).length > 0 &&
    Object.values((result as SplitWiseAPIError).errors).some(
      errorArray => Array.isArray(errorArray) && errorArray.length > 0
    )
  );
}

export function getErrorMessage(error: SplitWiseAPIError): string {
  const errorMessages: string[] = [];
  
  if (error.errors.base && Array.isArray(error.errors.base)) {
    errorMessages.push(...error.errors.base);
  }
  
  // Handle other error types
  Object.entries(error.errors).forEach(([key, value]) => {
    if (key !== 'base' && Array.isArray(value) && value.length > 0) {
      errorMessages.push(...value);
    }
  });
  
  return errorMessages.length > 0 ? errorMessages.join('; ') : 'An unknown error occurred';
}

// Helper function to check if a response indicates success
export function isSuccessfulResponse(result: unknown): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }
  
  // If it has an errors property with actual errors, it's not successful
  if (isAPIError(result)) {
    return false;
  }
  
  // If it has data or expense properties, it's likely successful
  const response = result as any;
  return (
    response.expense ||
    response.data ||
    response.id ||
    (!response.errors || Object.keys(response.errors || {}).length === 0)
  );
}

// API Response Types and Helpers

export interface APIError {
  error?: string;
  message?: string;
  details?: unknown;
}

export interface APISuccess {
  success?: boolean;
  expenses?: unknown[];
  expense?: unknown;
}

export type APIResponse = APIError | APISuccess | unknown;

/**
 * Check if response is an API error
 */
export function isAPIError(response: APIResponse): response is APIError {
  return (
    typeof response === 'object' &&
    response !== null &&
    ('error' in response || 'message' in response)
  );
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(response: APIError): string {
  return response.error || response.message || 'Unknown API error occurred';
}

/**
 * Check if response indicates success
 */
export function isSuccessfulResponse(response: APIResponse): response is APISuccess {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  
  // Check for explicit success indicators
  if ('success' in response && response.success === true) {
    return true;
  }
  
  // Check for expense data (indicates successful creation)
  if ('expenses' in response || 'expense' in response) {
    return true;
  }
  
  // If no error fields are present, assume success
  return !('error' in response || 'message' in response);
}
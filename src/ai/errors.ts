export class ReceiptExtractionError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ReceiptExtractionError';
  }
}

export class ValidationError extends ReceiptExtractionError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

export class AIServiceError extends ReceiptExtractionError {
  constructor(message: string, cause?: Error) {
    super(message, 'AI_SERVICE_ERROR', cause);
    this.name = 'AIServiceError';
  }
}

export class ImageProcessingError extends ReceiptExtractionError {
  constructor(message: string, cause?: Error) {
    super(message, 'IMAGE_PROCESSING_ERROR', cause);
    this.name = 'ImageProcessingError';
  }
}

export class ConfigurationError extends ReceiptExtractionError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

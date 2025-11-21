import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export function mapZodErrors(zodError: ZodError): FieldErrors {
  const errors: FieldErrors = {};

  zodError.issues.forEach((issue) => {
    // Join all path elements with dot notation to handle nested objects and arrays
    // e.g., ['addresses', 0, 'line1'] becomes 'addresses.0.line1'
    // usage pattern of the errors would be errors['addresses.0.line1']
    const fieldName = issue.path.join(".");
    if (fieldName) {
      errors[fieldName] = issue.message;
    }
  });

  return errors;
}

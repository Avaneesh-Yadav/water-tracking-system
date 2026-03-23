// Form value types (no Zod dependency).
// Validation is done via react-hook-form rules in the component.

export interface RegisterFormValues {
  fullName: string;
  mobileNumber: string;
  address: string;
  password: string;
  confirmPassword: string;
}

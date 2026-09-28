export interface CreateOnboardingDTO {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  templateId: string;
}

export interface OnboardingProgressDTO {
  currentStep: number;
  totalSteps: number;
  fieldResponses: Record<string, any>;
}

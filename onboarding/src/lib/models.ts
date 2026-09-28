import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  email: string;
  subscription: 'free' | 'pro' | 'enterprise';
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    introHeading: string;
    introSubheading: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ITemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'file' | 'select' | 'checkbox' | 'date';
  required: boolean;
  helpText?: string;
  options?: string[];
  placeholder?: string;
  order: number;
}

export interface ITemplateSection {
  title: string;
  description: string;
  fields: ITemplateField[];
  order: number;
}

export interface IOnboardingTemplate extends Document {
  businessId: string;
  name: string;
  description: string;
  sections: ITemplateSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFieldResponse {
  fieldName: string;
  value: any;
  fileUrl?: string;
}

export interface IOnboardingInstance extends Document {
  businessId: string;
  templateId: string;
  uniqueId: string;
  client: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  status: 'draft' | 'sent' | 'in_progress' | 'awaiting_client' | 'complete';
  progress: number;
  responses: IFieldResponse[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends Document {
  businessId: string;
  onboardingInstanceId: string;
  fieldName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

const TemplateFieldSchema = new Schema<ITemplateField>({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'textarea', 'email', 'phone', 'file', 'select', 'checkbox', 'date'],
    required: true,
  },
  required: { type: Boolean, 'default': true },
  helpText: String,
  options: [String],
  placeholder: String,
  order: { type: Number, required: true },
});

const TemplateSectionSchema = new Schema<ITemplateSection>({
  title: { type: String, required: true },
  description: String,
  fields: [TemplateFieldSchema],
  order: { type: Number, required: true },
});

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subscription: { type: String, enum: ['free', 'pro', 'enterprise'], 'default': 'free' },
    branding: {
      logoUrl: String,
      primaryColor: { type: String, 'default': '#0066cc' },
      secondaryColor: { type: String, 'default': '#f5f5f5' },
      introHeading: { type: String, 'default': "Let's get your business set up." },
      introSubheading: {
        type: String,
        'default': "We'll guide you through a few simple steps to collect the information we need to get started.",
      },
    },
  },
  { timestamps: true }
);

const OnboardingTemplateSchema = new Schema<IOnboardingTemplate>(
  {
    businessId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    sections: [TemplateSectionSchema],
  },
  { timestamps: true }
);

const FieldResponseSchema = new Schema<IFieldResponse>({
  fieldName: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  fileUrl: String,
});

const OnboardingInstanceSchema = new Schema<IOnboardingInstance>(
  {
    businessId: { type: String, required: true, index: true },
    templateId: { type: String, required: true },
    uniqueId: { type: String, required: true, unique: true, index: true },
    client: {
      name: { type: String, required: true },
      company: String,
      email: { type: String, required: true },
      phone: String,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'in_progress', 'awaiting_client', 'complete'],
      'default': 'draft',
    },
    progress: { type: Number, 'default': 0 },
    responses: [FieldResponseSchema],
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

const DocumentSchema = new Schema<IDocument>(
  {
    businessId: { type: String, required: true, index: true },
    onboardingInstanceId: { type: String, required: true },
    fieldName: { type: String, required: true },
    fileName: { type: String, required: true },
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, 'default': Date.now },
  },
  { timestamps: true }
);

export const Business =
  (mongoose.models.Business as mongoose.Model<IBusiness>) ||
  mongoose.model<IBusiness>('Business', BusinessSchema);

export const OnboardingTemplate =
  (mongoose.models.OnboardingTemplate as mongoose.Model<IOnboardingTemplate>) ||
  mongoose.model<IOnboardingTemplate>('OnboardingTemplate', OnboardingTemplateSchema);

export const OnboardingInstance =
  (mongoose.models.OnboardingInstance as mongoose.Model<IOnboardingInstance>) ||
  mongoose.model<IOnboardingInstance>('OnboardingInstance', OnboardingInstanceSchema);

export const DocumentModel =
  (mongoose.models.DocumentModel as mongoose.Model<IDocument>) ||
  mongoose.model<IDocument>('DocumentModel', DocumentSchema);

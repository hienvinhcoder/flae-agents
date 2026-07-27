import { z } from "zod";

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
const supportedDocumentName = /\.(pdf|md|txt)$/i;

interface DocumentMetadataValidationMessages {
  descriptionMax: string;
  titleMax: string;
  titleRequired: string;
}

export interface UploadDocumentValidationMessages
  extends DocumentMetadataValidationMessages {
  fileMaxSize: string;
  fileRequired: string;
  fileUnsupported: string;
}

export interface ManualDocumentValidationMessages
  extends DocumentMetadataValidationMessages {
  contentRequired: string;
}

const defaultValidationMessages = {
  contentRequired: "Enter document content.",
  descriptionMax: "Description must be 1,000 characters or fewer.",
  fileMaxSize: "Document size must not exceed 50 MB.",
  fileRequired: "Select a document.",
  fileUnsupported: "Choose a PDF, Markdown, or text document.",
  titleMax: "Title must be 500 characters or fewer.",
  titleRequired: "Enter a document title.",
};

function optionalDescription(messages: DocumentMetadataValidationMessages) {
  return z
    .string()
    .trim()
    .max(1_000, messages.descriptionMax)
    .optional()
    .transform((value) => value || undefined);
}

function documentTitle(messages: DocumentMetadataValidationMessages) {
  return z
    .string()
    .trim()
    .min(1, messages.titleRequired)
    .max(500, messages.titleMax);
}

export function createUploadDocumentSchema(
  messages: UploadDocumentValidationMessages,
) {
  return z.object({
    description: optionalDescription(messages),
    file: z
      .custom<File>((value) => value instanceof File, messages.fileRequired)
      .refine(
        (file) => supportedDocumentName.test(file.name),
        messages.fileUnsupported,
      )
      .refine(
        (file) => file.size <= MAX_DOCUMENT_SIZE,
        messages.fileMaxSize,
      ),
    title: documentTitle(messages),
  });
}

export function createManualDocumentSchema(
  messages: ManualDocumentValidationMessages,
) {
  return z.object({
    content_text: z.string().trim().min(1, messages.contentRequired),
    description: optionalDescription(messages),
    title: documentTitle(messages),
  });
}

export const uploadDocumentSchema = createUploadDocumentSchema(
  defaultValidationMessages,
);
export const manualDocumentSchema = createManualDocumentSchema(
  defaultValidationMessages,
);

export type UploadDocumentForm = z.infer<typeof uploadDocumentSchema>;
export type ManualDocumentForm = z.infer<typeof manualDocumentSchema>;
export type UploadDocumentInput = z.input<typeof uploadDocumentSchema>;
export type ManualDocumentInput = z.input<typeof manualDocumentSchema>;

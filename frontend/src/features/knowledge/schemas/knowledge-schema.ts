import { z } from "zod";

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
const supportedDocumentName = /\.(pdf|md|txt)$/i;

const optionalDescription = z
  .string()
  .trim()
  .max(1_000, "Description must be 1,000 characters or fewer.")
  .optional()
  .transform((value) => value || undefined);

export const uploadDocumentSchema = z.object({
  description: optionalDescription,
  file: z
    .custom<File>((value) => value instanceof File, "Select a document.")
    .refine(
      (file) => supportedDocumentName.test(file.name),
      "Choose a PDF, Markdown, or text document.",
    )
    .refine(
      (file) => file.size <= MAX_DOCUMENT_SIZE,
      "Document size must not exceed 50 MB.",
    ),
  title: z
    .string()
    .trim()
    .min(1, "Enter a document title.")
    .max(500, "Title must be 500 characters or fewer."),
});

export const manualDocumentSchema = z.object({
  content_text: z.string().trim().min(1, "Enter document content."),
  description: optionalDescription,
  title: z
    .string()
    .trim()
    .min(1, "Enter a document title.")
    .max(500, "Title must be 500 characters or fewer."),
});

export type UploadDocumentForm = z.infer<typeof uploadDocumentSchema>;
export type ManualDocumentForm = z.infer<typeof manualDocumentSchema>;
export type UploadDocumentInput = z.input<typeof uploadDocumentSchema>;
export type ManualDocumentInput = z.input<typeof manualDocumentSchema>;

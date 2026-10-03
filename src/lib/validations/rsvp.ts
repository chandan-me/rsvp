import { z } from "zod";

export const rsvpAnswerItemSchema = z.object({
  question_id: z.string().uuid().or(z.string().min(1)),
  answer_text: z.string().optional().nullable(),
  answer_json: z.union([z.array(z.string()), z.boolean()]).optional().nullable(),
});

export const plusOneDetailSchema = z.object({
  first_name: z.string().max(60).optional(),
  last_name: z.string().max(60).optional(),
  name: z.string().max(120).optional(),
  email: z.string().email("Valid plus-one email required"),
});

export const rsvpSubmissionSchema = z.object({
  event_id: z.string().uuid().or(z.string().min(1)),
  first_name: z.string().min(1, "First name is required").max(60),
  last_name: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30).optional().nullable(),
  status: z.enum(["attending", "declined", "pending_approval", "waitlisted"]).default("attending"),
  plus_ones_count: z.coerce.number().int().min(0).default(0),
  plus_ones_details: z.array(plusOneDetailSchema).optional().default([]),
  tier_id: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  answers: z.array(rsvpAnswerItemSchema).default([]),
});

export const rsvpQuestionSchema = z.object({
  prompt: z.string().min(2, "Question prompt is required").max(300),
  question_type: z.enum([
    "text",
    "textarea",
    "single_choice",
    "multiple_choice",
    "boolean",
    "file_upload",
    "image_upload",
  ]),
  is_required: z.boolean().default(false),
  order_index: z.number().int().default(0),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        order_index: z.number().int().default(0),
      })
    )
    .optional(),
});

export type RsvpSubmissionInput = z.infer<typeof rsvpSubmissionSchema>;
export type RsvpQuestionInput = z.infer<typeof rsvpQuestionSchema>;

import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(2, "Event title must be at least 2 characters").max(120, "Title is too long"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(80, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(2000, "Description must be under 2000 characters").optional().nullable(),
  cover_image_url: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  start_date: z.string().min(1, "Start date and time are required"),
  end_date: z.string().optional().nullable().or(z.literal("")),
  timezone: z.string().default("UTC"),
  location_name: z.string().max(150).optional().nullable(),
  location_address: z.string().max(250).optional().nullable(),
  is_published: z.boolean().default(true),
  max_capacity: z.coerce.number().int().positive("Capacity must be positive").optional().nullable(),
});

export const eventSettingsSchema = z.object({
  allow_guest_list_public: z.boolean().default(false),
  notify_host_on_rsvp: z.boolean().default(true),
  confirmation_email_enabled: z.boolean().default(true),
  checkin_pin: z.string().max(10).optional().nullable(),
  close_rsvp_at: z.string().optional().nullable(),
  is_rsvp_closed: z.boolean().default(false),
});

export type EventInput = z.infer<typeof eventSchema>;
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;

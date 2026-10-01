import { z } from "zod";

export const guestSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(60),
  last_name: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30).optional().nullable(),
  status: z.enum(["invited", "pending", "attending", "declined"]).default("pending"),
  plus_ones_allowed: z.coerce.number().int().min(0, "Cannot be negative").default(0),
  plus_ones_count: z.coerce.number().int().min(0, "Cannot be negative").default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const bulkGuestSchema = z.object({
  guests: z.array(guestSchema).min(1, "At least one guest is required"),
});

export type GuestInput = z.infer<typeof guestSchema>;
export type BulkGuestInput = z.infer<typeof bulkGuestSchema>;

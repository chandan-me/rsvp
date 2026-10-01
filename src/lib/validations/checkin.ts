import { z } from "zod";

export const checkinRequestSchema = z.object({
  event_id: z.string().uuid().or(z.string().min(1)),
  code_or_token: z.string().min(3, "Code or token is required"),
  method: z.enum(["qr_scan", "manual"]).default("qr_scan"),
  pin: z.string().optional().nullable(),
  checkpoint: z.string().optional().nullable(),
  gate_user_id: z.string().optional().nullable(),
});

export type CheckinRequestInput = z.infer<typeof checkinRequestSchema>;

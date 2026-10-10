import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email().max(255),
  type: z.enum(['signup', 'reset']),
});

export type SendOtpInputDTO = z.infer<typeof sendOtpSchema>;

import { z } from 'zod';

// 72 chars is bcrypt's input limit.
const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const registerSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().email().transform((email) => email.toLowerCase()),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().transform((email) => email.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

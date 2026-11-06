import { z } from 'zod';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from '../../domain/policies/credentials.policy.ts';

export const LINK_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export const linkTokenField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(LINK_TOKEN_PATTERN, 'This link is incomplete or invalid');

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(255));

export const newPasswordField = (minLength = PASSWORD_MIN_LENGTH) =>
  z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters`)
    .refine(
      (p) => byteLength(p) <= PASSWORD_MAX_BYTES,
      `Password too long (exceeds ${PASSWORD_MAX_BYTES} bytes)`,
    );

export const personNameField = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100);

export const secretField = (label: string) => z.string().min(1, `${label} is required`).max(128);

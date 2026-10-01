import { z } from 'zod';

export const EventKind = z.enum([
  'device.claim',
  'quiz.attempt',
  'gullak.credit',
  'gullak.redeem',
  'gullak.reverse',
]);

export const QuizAttemptPayload = z.object({
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  quiz_id: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
});

export const DeviceClaimPayload = z.object({
  link_code: z.string(),
});

export const GullakCreditPayload = z.object({
  amount: z.number().int().positive(),
  reason: z.string(),
});

export const GullakRedeemPayload = z.object({
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  item_id: z.string().uuid(),
  amount: z.number().int().positive(),
});

export const GullakReversePayload = z.object({
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  original_event_id: z.string().uuid(),
});

export const LedgerEventSchema = z.object({
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  id: z.string().uuid(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  student_id: z.string().uuid(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  device_id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  prev_hash: z.string().nullable(),
  kind: EventKind,
  payload: z.unknown(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  client_ts: z.string().datetime(),
  content_version: z.string(),
  signature: z.string(),
});

export type LedgerEvent = z.infer<typeof LedgerEventSchema>;

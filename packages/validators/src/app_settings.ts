import { z } from "zod";

export const AppSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
});
export type AppSetting = z.infer<typeof AppSettingSchema>;

export const AppSettingUpdateInputSchema = z
  .object({
    key: z.string().min(1),
    value: z.string(),
  })
  .strict();
export type AppSettingUpdateInput = z.infer<typeof AppSettingUpdateInputSchema>;

// ─── Reminder schedule (F17 — configurable renewal-reminder windows) ────────
//
// Persisted as a single comma-separated text value in app_setting under the
// key "reminder_schedule" (e.g. "30, 14, 7"). The cron loops these windows
// once per day and sends one labeled email per non-empty window.

const REMINDER_SCHEDULE_MIN_DAYS = 1;
const REMINDER_SCHEDULE_MAX_DAYS = 365;
const REMINDER_SCHEDULE_MAX_WINDOWS = 10;
const REMINDER_SCHEDULE_DEFAULT: readonly number[] = [7] as const;

/**
 * Boundary schema. Accepts the raw string the admin types (or the row stored
 * in app_setting) and produces a sorted, deduped number[] of windows.
 *
 * Rejects: empty list, duplicates, non-integer entries, values outside
 * [1, 365], more than 10 windows. The cron's read-side has a softer fallback
 * (see `parseReminderSchedule`) so prod stays alive on a corrupt row.
 */
export const ReminderScheduleSchema = z
  .string()
  .transform((raw, ctx) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter at least one window, e.g. 30, 14, 7",
      });
      return z.NEVER;
    }

    if (parts.length > REMINDER_SCHEDULE_MAX_WINDOWS) {
      ctx.addIssue({
        code: "custom",
        message: `Maximum ${REMINDER_SCHEDULE_MAX_WINDOWS} windows`,
      });
      return z.NEVER;
    }

    const windows: number[] = [];
    for (const part of parts) {
      // Bare integer — no decimals, no signs, no scientific notation.
      if (!/^\d+$/.test(part)) {
        ctx.addIssue({
          code: "custom",
          message: `"${part}" is not a positive integer`,
        });
        return z.NEVER;
      }
      const n = Number.parseInt(part, 10);
      if (
        n < REMINDER_SCHEDULE_MIN_DAYS ||
        n > REMINDER_SCHEDULE_MAX_DAYS
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Each window must be between ${REMINDER_SCHEDULE_MIN_DAYS} and ${REMINDER_SCHEDULE_MAX_DAYS} days`,
        });
        return z.NEVER;
      }
      windows.push(n);
    }

    const unique = new Set(windows);
    if (unique.size !== windows.length) {
      ctx.addIssue({
        code: "custom",
        message: "Remove duplicate windows",
      });
      return z.NEVER;
    }

    // Sort descending so emails go out in "most advance notice first" order.
    return windows.sort((a, b) => b - a);
  });

/**
 * Soft parser for the cron's read path. Returns the default `[7]` when the
 * stored row is null, empty, or fails the boundary schema. Never throws — a
 * corrupt row should degrade to the historical 7-day behavior, not crash the
 * job. The strict schema (`ReminderScheduleSchema`) guards admin writes so
 * "corrupt" only happens via a direct DB edit.
 */
export function parseReminderSchedule(
  raw: string | null | undefined,
): number[] {
  if (raw == null || raw.trim().length === 0) {
    return [...REMINDER_SCHEDULE_DEFAULT];
  }
  const parsed = ReminderScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return [...REMINDER_SCHEDULE_DEFAULT];
  }
  return parsed.data;
}

export const ReminderScheduleUpdateInputSchema = z
  .object({
    value: z.string(),
  })
  .strict();
export type ReminderScheduleUpdateInput = z.infer<
  typeof ReminderScheduleUpdateInputSchema
>;

export const ReminderScheduleOutputSchema = z.object({
  /** The raw persisted (or default) string — what to show in the admin input. */
  value: z.string(),
  /** Parsed + normalised windows (sorted descending). */
  windows: z.array(z.number().int().positive()),
});
export type ReminderScheduleOutput = z.infer<typeof ReminderScheduleOutputSchema>;

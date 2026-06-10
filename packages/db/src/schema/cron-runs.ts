import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core"

export const cronStatusEnum = pgEnum("cron_status", [
  "running",
  "succeeded",
  "failed",
  "skipped",
])

export const cronRuns = pgTable(
  "cron_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    job_name: text("job_name").notNull(),
    status: cronStatusEnum("status").notNull().default("running"),
    summary: text("summary"),
    error: text("error"),
    rows_affected: integer("rows_affected"),
    started_at: timestamp("started_at").defaultNow().notNull(),
    finished_at: timestamp("finished_at"),
  },
  (table) => [
    index("cr_job_started_idx").on(table.job_name, table.started_at),
  ],
)

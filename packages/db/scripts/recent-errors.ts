import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const r = await pool.query(
    "SELECT at, level, message, meta FROM error_log WHERE message LIKE 'operation%' ORDER BY at DESC LIMIT 5",
  )
  for (const row of r.rows) {
    console.log(`---\n${row.at}  ${row.level}  ${row.message}`)
    const meta = row.meta as Record<string, unknown>
    console.log("op:", meta.op, "requestId:", meta.requestId)
    console.log("error tail:", String(meta.error).slice(-400))
  }
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

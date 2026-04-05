import { neon } from "@neondatabase/serverless"

let cachedSql: ReturnType<typeof neon> | null = null

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientDbError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ""

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout")
  )
}

function resetSqlClient() {
  cachedSql = null
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!cachedSql) {
    cachedSql = neon(databaseUrl)
  }

  return cachedSql
}

export const sql = (async (...args: Parameters<ReturnType<typeof neon>>) => {
  let lastError: unknown
  const maxAttempts = 4

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const client = getSqlClient()
      return await client(...args)
    } catch (error) {
      lastError = error

      if (!isTransientDbError(error) || attempt === maxAttempts - 1) {
        break
      }

      resetSqlClient()

      // Exponential backoff with small jitter to reduce retry thundering.
      const jitter = Math.floor(Math.random() * 120)
      await sleep(250 * 2 ** attempt + jitter)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Database query failed")
}) as any

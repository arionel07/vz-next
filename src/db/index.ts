import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured')
}

const globalForDatabase = globalThis as unknown as {
  mysqlPool?: mysql.Pool
}

const pool =
  globalForDatabase.mysqlPool ??
  mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.mysqlPool = pool
}

export const db = drizzle(pool)

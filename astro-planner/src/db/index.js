import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

// Create a SQL query function using the Neon serverless driver
const sql = neon(process.env.DATABASE_URL)

// Create the Drizzle database instance with schema
export const db = drizzle(sql, { schema })

// Export schema for use in queries
export * from './schema.js'

import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '../.env'), quiet: true })
config({ path: resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.DATABASE_URL?.trim()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(url ? { dbCredentials: { url } } : { driver: 'pglite', dbCredentials: { url: './.data/pgdata' } }),
})

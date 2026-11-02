import {mkdirSync } from 'node:fs'
import { Database} from 'bun:sqlite'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'

mkdirSync('./data', { recursive: true })

const app = new Hono()
const db = new Database('data/app.db');

db.exec(`
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`)

app.use('/*', serveStatic({ root: './public' }))

export default {
    port: 3000,
    hostname: '0.0.0.0',
    fetch: app.fetch
}
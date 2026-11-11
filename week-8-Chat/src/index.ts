import { mkdirSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'

type Note = {
  id: number
  body: string
  created_at: string
}

mkdirSync('data', { recursive: true })

const app = new Hono()
const db = new Database('data/app.db')
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3:270m"


// Allow the separately hosted HTTP frontend to call the API, including preflighted POST and DELETE requests.
app.use('*', cors())

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

app.get('/api/v1/health', (c) => c.json({ ok: true }))

app.get('/api/v1/notes', (c) => {
  // Use creation time for newest-first ordering; id breaks ties for notes created in the same second.
  const rows = db.query('SELECT id, body, created_at FROM notes ORDER BY created_at DESC, id DESC').all() as Note[]
  return c.json({ notes: rows })
})

app.post('/api/v1/notes', async (c) => {
  const body = await c.req.json() as { body?: string }
  if (!body.body || body.body.trim().length === 0) {
    return c.json({ error: 'Note body is required' }, 400)
  }
  const result = db.query('INSERT INTO notes (body) VALUES (?)').run(body.body)
  return c.json({ id: Number(result.lastInsertRowid) }, 201)
})

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434"

app.get("/api/ollama-status", async (c) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!response.ok) {
      return c.json({ ok: false, error: `Ollama returned ${response.status}` }, 503)
    }
    const payload = (await response.json()) as { models?: Array<{ name?: string }> }
    const models = (payload.models ?? [])
      .map((model) => model.name ?? "")
      .filter((name) => name.length > 0)
    return c.json({ ok: true, ollamaUrl: OLLAMA_URL, models })
  } catch (error) {
    return c.json({ ok: false, error: String(error) }, 503)
  }
})
 
app.post("/api/chat", async (c) => {
  const body = await c.req.json<{ messages?: Array<{ role?: string; content?: string }> }>()
  // TODO(student): validate messages is a non-empty array of { role, content }
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: body.messages, stream: false }),
  })
  // TODO(student): handle !response.ok, empty reply, and return { reply, source: "ollama", model: OLLAMA_MODEL }
})

app.delete('/api/v1/notes/:id', (c) => {
  // Reject malformed ids before querying SQLite, and report when no note matched the id.
  const rawId = c.req.param('id')
  const id = Number(rawId)
  if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(id)) {
    return c.json({ error: 'Note id must be a positive integer' }, 400)
  }

  const result = db.query('DELETE FROM notes WHERE id = ?').run(id)
  if (result.changes === 0) {
    return c.json({ error: 'Note not found' }, 404)
  }

  return c.body(null, 204)
})

app.use('/*', serveStatic({ root: './public' }))

export default {
  port: 3000,
  hostname: '0.0.0.0',
  fetch: app.fetch,
}

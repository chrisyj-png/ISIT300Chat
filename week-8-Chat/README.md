# Week 8 — finished baseline demo

Instructor-only. This is the completed Week 8 baseline, with the README work filled in. Do not link it from student pages.

Students start from `starter-repos/isit300-dev-baseline`. Class follow-alongs are [`../week-8-class-1`](../week-8-class-1) and [`../week-8-class-2`](../week-8-class-2).

## Run

```sh
./setup-https.sh
docker compose up --build
```

`setup-https.sh` adds `week8.test` to `/etc/hosts` and installs the mkcert CA into Firefox. Restart Firefox after it runs. Caddy's `tls internal` certificate is not enough: Firefox does not trust that CA, and it will not let you click through the warning on `localhost`.

Open:

- HTTPS: https://week8.test
- App direct: http://localhost:3010
- Notes frontend (plain HTTP): http://localhost:8080
- Health: http://localhost:3010/api/v1/health

The app stays on port **3010** so a class scaffold can keep http://localhost:3000. This demo owns ports **80** and **443**. Stop it before a Class 2 stack that also binds https://localhost.

## What it shows

- Bun runs `src/index.ts` directly. There is no Node image and no compile step.
- `GET /api/v1/health` returns `{"ok":true}`.
- `GET /api/v1/notes`, `POST /api/v1/notes`, and `DELETE /api/v1/notes/:id` read and write the `notes` table. The API allows cross-origin requests for the local frontend.
- The `frontend` Compose service uses nginx to serve `frontend/` over HTTP on port 8080. It calls the Hono API directly on port 3010.
- `data/app.db` is the SQLite file. `./data` is mounted, so a restart keeps the rows.
- Caddy terminates HTTPS for `week8.test` and proxies to `app:3000`. The certificate is issued by the local mkcert CA.
- `bun run typecheck` passes.

## Where the notes changes live

- `compose.yml` adds the `frontend` nginx service on port 8080. It serves static files directly over HTTP and is not added to Caddy or the certificate setup.
- `src/index.ts` enables Hono CORS for browser requests, orders notes by `created_at`, and adds `DELETE /api/v1/notes/:id`.
- `frontend/index.html` contains the body-only form, status and empty-state messages, and the container for rendered notes.
- `frontend/app.js` fetches and sorts notes, posts `{ body }` as JSON, creates delete buttons, and reloads the list after successful changes.
- `frontend/styles.css` lays out notes in a separated three-column desktop grid that adapts to smaller screens.

## Dev Container

Open this folder in VS Code or Cursor and choose **Reopen in Container**.

## Typecheck

```sh
docker compose exec app bun run typecheck
```

## Routes, in the words students still have to write themselves

`/api/v1/health` is a GET route that answers with JSON so you can tell the app process is up. It does not touch SQLite.

`/api/v1/notes` is the notes API. GET returns the rows newest first by `created_at`. POST expects JSON with a non-empty `body`, inserts that text, and returns the new id. A blank body is a 400. DELETE accepts a note id in the path and returns 404 if it does not exist.

Restart the stack with `docker compose restart`. GET `/api/v1/notes` again. The rows are still there because `data/app.db` lives on the mounted `./data` directory, not only inside the container filesystem.

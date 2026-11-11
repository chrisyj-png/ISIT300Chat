const API_URL = 'http://localhost:3010/api/v1/notes'

const form = document.querySelector('#note-form')
const bodyInput = document.querySelector('#note-body')
const notesList = document.querySelector('#notes-list')
const emptyState = document.querySelector('#empty-state')
const statusMessage = document.querySelector('#status')
const errorMessage = document.querySelector('#error')
const submitButton = form.querySelector('button[type="submit"]')

function showError(message) {
  errorMessage.textContent = message
  errorMessage.hidden = false
}

function clearError() {
  errorMessage.textContent = ''
  errorMessage.hidden = true
}

function formatDate(createdAt) {
  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString()
}

function createNoteCard(note) {
  const card = document.createElement('article')
  card.className = 'note-card'

  const text = document.createElement('p')
  text.className = 'note-body'
  text.textContent = note.body

  const footer = document.createElement('div')
  footer.className = 'note-footer'

  const date = document.createElement('time')
  date.dateTime = note.created_at
  date.textContent = formatDate(note.created_at)

  const deleteButton = document.createElement('button')
  deleteButton.className = 'delete-button'
  deleteButton.type = 'button'
  deleteButton.textContent = 'Delete'
  deleteButton.setAttribute('aria-label', `Delete note: ${note.body}`)
  deleteButton.addEventListener('click', () => deleteNote(note.id, deleteButton))

  footer.append(date, deleteButton)
  card.append(text, footer)
  return card
}

// Fetch the API list, sort by creation time, and render either cards or the empty state.
async function loadNotes() {
  statusMessage.textContent = 'Loading notes…'
  emptyState.hidden = true
  clearError()

  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`The notes request failed (${response.status}).`)
    }

    const data = await response.json()
    if (!Array.isArray(data.notes)) {
      throw new Error('The notes response was not in the expected format.')
    }

    const notes = data.notes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    notesList.replaceChildren(...notes.map(createNoteCard))
    emptyState.hidden = notes.length !== 0
    statusMessage.textContent = notes.length === 0
      ? 'No notes to show.'
      : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
  } catch (error) {
    statusMessage.textContent = ''
    showError(error instanceof Error ? error.message : 'Could not load notes.')
  }
}

// Send only { body } as JSON and reload the list after a successful create.
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  clearError()

  const body = bodyInput.value.trim()
  if (!body) {
    showError('Please enter a note before saving.')
    bodyInput.focus()
    return
  }

  submitButton.disabled = true
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!response.ok) {
      throw new Error(`The note could not be saved (${response.status}).`)
    }

    form.reset()
    await loadNotes()
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Could not save the note.')
  } finally {
    submitButton.disabled = false
  }
})

async function deleteNote(id, button) {
  clearError()
  button.disabled = true

  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`The note could not be deleted (${response.status}).`)
    }

    // Refresh from the API so the deleted note disappears and the empty state stays accurate.
    await loadNotes()
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Could not delete the note.')
    button.disabled = false
  }
}

loadNotes()

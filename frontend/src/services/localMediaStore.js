const DB_NAME = 'hourlyrecruit-assessment-local'
const DB_VERSION = 2
const STORE_NAME = 'assessment-media'
const PENDING_KEY = 'pending-verification'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open local media storage.'))
  })
}

async function put(record) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => { db.close(); resolve(record) }
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Unable to save local media.')) }
  })
}

async function remove(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Unable to remove local media.')) }
  })
}

async function get(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('Unable to read local media.'))
    tx.oncomplete = () => db.close()
  })
}

export async function saveVerificationDraft({ photoDataUrl, verificationStatus, validationSummary }) {
  if (!photoDataUrl) throw new Error('A live verification photo is required.')

  return put({
    key: PENDING_KEY,
    kind: 'verification-draft',
    verificationPhoto: photoDataUrl,
    verificationStatus: verificationStatus || 'preflight_pending',
    validationSummary: validationSummary || null,
    updatedAt: new Date().toISOString(),
  })
}

export async function attachVerificationToExam(examId, candidateId) {
  const draft = await get(PENDING_KEY)
  if (!draft) return false

  await put({
    key: `${examId}:verification`,
    kind: 'verification',
    examId,
    candidateId: candidateId || null,
    idType: 'Government ID held in live photo',
    verificationPhoto: draft.verificationPhoto,
    verificationStatus: draft.verificationStatus,
    validationSummary: draft.validationSummary,
    capturedAt: draft.updatedAt || new Date().toISOString(),
  })

  await remove(PENDING_KEY)
  return true
}

export async function saveAssessmentRecording(examId, blob) {
  if (!blob?.size) return false
  await put({
    key: `${examId}:recording`,
    kind: 'recording',
    examId,
    blob,
    mimeType: blob.type || 'video/webm',
    size: blob.size,
    createdAt: new Date().toISOString(),
  })
  return true
}

export async function getAssessmentMedia(examId) {
  const [storedVerification, recording] = await Promise.all([
    get(`${examId}:verification`),
    get(`${examId}:recording`),
  ])

  // Keep previously stored verification records readable after the schema change.
  const verification = storedVerification
    ? {
        ...storedVerification,
        verificationPhoto: storedVerification.verificationPhoto || storedVerification.photoDataUrl || '',
        verificationStatus: storedVerification.verificationStatus || 'legacy_capture',
        capturedAt: storedVerification.capturedAt || storedVerification.createdAt || null,
      }
    : null

  return { verification, recording }
}

export async function removeAssessmentMedia(examId) {
  if (!examId) return false
  await Promise.all([
    remove(`${examId}:verification`),
    remove(`${examId}:recording`),
  ])
  return true
}

export async function listAssessmentMedia() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    request.onsuccess = () => { db.close(); resolve(request.result || []) }
    request.onerror = () => { db.close(); reject(request.error || new Error('Unable to read local media index.')) }
  })
}

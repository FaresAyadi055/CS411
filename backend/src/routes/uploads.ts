import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ulid } from '../lib/ulid'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { AppError } from '../lib/errors'

const UPLOAD_DIR = join(import.meta.dirname, '../../../database/localstorage')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 2 * 1024 * 1024

export const uploadRoutes = new Hono()

uploadRoutes.post('/logo', requireAuth(), requireRole('business'), async (c) => {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    throw new AppError(400, 'Expected multipart/form-data', 'INVALID_CONTENT_TYPE')
  }

  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'No file provided', 'NO_FILE')
  }

  if (file.size > MAX_SIZE) {
    throw new AppError(400, 'File too large (max 2MB)', 'FILE_TOO_LARGE')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPG, PNG, WebP, SVG', 'INVALID_FILE_TYPE')
  }

  const ext = file.type === 'image/svg+xml' ? '.svg'
    : file.type === 'image/webp' ? '.webp'
    : file.type === 'image/png' ? '.png'
    : '.jpg'

  const id = ulid() + ext
  const buffer = Buffer.from(await file.arrayBuffer())

  const fs = await import('node:fs/promises')
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(join(UPLOAD_DIR, id), buffer)

  const url = `/api/uploads/${id}`
  return c.json({ url, id })
})

uploadRoutes.post('/reward', requireAuth(), requireRole('business'), async (c) => {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    throw new AppError(400, 'Expected multipart/form-data', 'INVALID_CONTENT_TYPE')
  }

  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'No file provided', 'NO_FILE')
  }

  if (file.size > MAX_SIZE) {
    throw new AppError(400, 'File too large (max 2MB)', 'FILE_TOO_LARGE')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError(400, 'Invalid file type. Allowed: JPG, PNG, WebP, SVG', 'INVALID_FILE_TYPE')
  }

  const ext = file.type === 'image/svg+xml' ? '.svg'
    : file.type === 'image/webp' ? '.webp'
    : file.type === 'image/png' ? '.png'
    : '.jpg'

  const id = ulid() + ext
  const buffer = Buffer.from(await file.arrayBuffer())

  const fs = await import('node:fs/promises')
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(join(UPLOAD_DIR, id), buffer)

  const url = `/api/uploads/${id}`
  return c.json({ url, id })
})

uploadRoutes.get('/:filename', async (c) => {
  const filename = c.req.param('filename')

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new AppError(400, 'Invalid filename', 'INVALID_FILENAME')
  }

  try {
    const filePath = join(UPLOAD_DIR, filename)
    const data = await readFile(filePath)

    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    throw new AppError(404, 'File not found', 'FILE_NOT_FOUND')
  }
})

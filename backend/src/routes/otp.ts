import { eq } from 'drizzle-orm'
import { db } from '../db'
import { authUsers, account } from '../db/schema'
import { sendOtp, verifyOtp } from '../services/otp'
import { hashPassword } from '../lib/auth-password'

async function parseJson(c: any) {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

export async function handleSendVerification(c: any) {
  const body = await parseJson(c)
  if (!body || !body.email) return c.json({ message: 'Email is required' }, 400)

  const email = String(body.email).toLowerCase()
  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (!authUser) return c.json({ message: 'No account found with this email' }, 404)
  if (authUser.emailVerified) return c.json({ message: 'Email already verified' }, 400)

  try {
    await sendOtp(email, 'signup', body.locale)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('send-verification-otp error:', msg)
    return c.json({ message: msg }, 500)
  }

  return c.json({ message: 'Verification code sent' })
}

export async function handleVerifyEmail(c: any) {
  const body = await parseJson(c)
  if (!body || !body.email || !body.code) return c.json({ message: 'Email and code are required' }, 400)

  const email = String(body.email).toLowerCase()
  const code = String(body.code)

  if (code.length !== 6) return c.json({ message: 'Code must be 6 digits' }, 400)

  const valid = await verifyOtp(email, code, 'signup')
  if (!valid) return c.json({ message: 'Invalid or expired code' }, 400)

  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (authUser) {
    await db
      .update(authUsers)
      .set({ emailVerified: true })
      .where(eq(authUsers.id, authUser.id))
  }

  return c.json({ message: 'Email verified successfully' })
}

export async function handleSendReset(c: any) {
  const body = await parseJson(c)
  if (!body || !body.email) return c.json({ message: 'Email is required' }, 400)

  const email = String(body.email).toLowerCase()
  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (!authUser) return c.json({ message: 'No account found with this email' }, 404)

  try {
    await sendOtp(email, 'reset', body.locale)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('send-reset-otp error:', msg)
    return c.json({ message: msg }, 500)
  }

  return c.json({ message: 'Reset code sent' })
}

export async function handleResetPassword(c: any) {
  const body = await parseJson(c)
  if (!body || !body.email || !body.code || !body.newPassword) return c.json({ message: 'Email, code, and new password are required' }, 400)

  const email = String(body.email).toLowerCase()
  const code = String(body.code)
  const newPassword = String(body.newPassword)

  if (code.length !== 6) return c.json({ message: 'Code must be 6 digits' }, 400)
  if (newPassword.length < 8) return c.json({ message: 'Password must be at least 8 characters' }, 400)

  const valid = await verifyOtp(email, code, 'reset')
  if (!valid) return c.json({ message: 'Invalid or expired code' }, 400)

  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1)

  if (!authUser) return c.json({ message: 'No account found with this email' }, 404)

  const hashed = await hashPassword(newPassword)

  await db
    .update(account)
    .set({ password: hashed })
    .where(eq(account.userId, authUser.id))

  return c.json({ message: 'Password reset successfully' })
}

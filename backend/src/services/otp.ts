import { eq, and, gte, lt } from 'drizzle-orm'
import { ulid } from 'ulid'
import { Resend } from 'resend'
import { db } from '../db'
import { verification } from '../db/schema'
import { env } from '../config/env'

type Locale = 'en' | 'fr' | 'ar'

const OTP_EXPIRY_MS = 15 * 60 * 1000
const OTP_LENGTH = 6

const otpMessages: Record<Locale, { signup: { subject: string; intro: string; codeLabel: string; expires: string }; reset: { subject: string; intro: string; codeLabel: string; expires: string; ignore: string } }> = {
  en: {
    signup: { subject: 'Verify your email', intro: 'Welcome!', codeLabel: 'Your verification code is:', expires: 'This code expires in 15 minutes.' },
    reset: { subject: 'Password reset', intro: 'You requested a password reset.', codeLabel: 'Your reset code is:', expires: 'This code expires in 15 minutes.', ignore: "If you didn't request this, you can ignore this email." },
  },
  fr: {
    signup: { subject: 'Vérifiez votre email', intro: 'Bienvenue !', codeLabel: 'Votre code de vérification est :', expires: 'Ce code expire dans 15 minutes.' },
    reset: { subject: 'Réinitialisation du mot de passe', intro: 'Vous avez demandé une réinitialisation de mot de passe.', codeLabel: 'Votre code de réinitialisation est :', expires: 'Ce code expire dans 15 minutes.', ignore: "Si vous n'avez pas demandé cela, vous pouvez ignorer cet email." },
  },
  ar: {
    signup: { subject: 'تحقق من بريدك الإلكتروني', intro: 'مرحبًا بك!', codeLabel: 'رمز التحقق الخاص بك هو:', expires: 'ينتهي صلاحية هذا الرمز خلال 15 دقيقة.' },
    reset: { subject: 'إعادة تعيين كلمة المرور', intro: 'لقد طلبت إعادة تعيين كلمة المرور.', codeLabel: 'رمز إعادة التعيين الخاص بك هو:', expires: 'ينتهي صلاحية هذا الرمز خلال 15 دقيقة.', ignore: 'إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد الإلكتروني.' },
  },
}

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!env.resendApiKey) return null
  if (!_resend) _resend = new Resend(env.resendApiKey)
  return _resend
}

function generateOtp(): string {
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

function identifier(email: string, purpose: string): string {
  return `otp:${purpose}:${email.toLowerCase()}`
}

function normalizeLocale(l: string | null | undefined): Locale {
  if (l === 'fr' || l === 'ar') return l
  return 'en'
}

export async function sendOtp(email: string, purpose: 'signup' | 'reset', locale?: string | null): Promise<string> {
  const ident = identifier(email, purpose)
  const now = new Date()

  await db.delete(verification).where(
    and(eq(verification.identifier, ident), lt(verification.expiresAt, now)),
  )

  const [existing] = await db
    .select({ id: verification.id })
    .from(verification)
    .where(and(eq(verification.identifier, ident), gte(verification.expiresAt, now)))
    .limit(1)

  if (existing) {
    throw new Error('A verification code was already sent. Please wait before requesting another.')
  }

  const r = getResend()
  if (!r) throw new Error('Resend API key not configured')

  const code = generateOtp()

  const loc = normalizeLocale(locale)
  const msgs = otpMessages[loc]
  const signup = msgs.signup
  const reset = msgs.reset
  const msg = purpose === 'reset' ? reset : signup
  const subject = msg.subject
  const ignore = purpose === 'reset' ? reset.ignore : ''
  const html = `<p>${msg.intro}</p><p>${msg.codeLabel}</p><h2 style="letter-spacing:0.25em;font-size:1.5rem">${code}</h2><p>${msg.expires}</p>${ignore ? `<p>${ignore}</p>` : ''}`

  const result = await r.emails.send({
    from: env.resendFrom,
    to: email,
    subject,
    html,
  })

  if (result.error) throw new Error(`Resend error: ${result.error.message}`)

  const id = ulid()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

  await db.insert(verification).values({
    id,
    identifier: ident,
    value: code,
    expiresAt,
  } as typeof verification.$inferInsert)

  return code
}

export async function verifyOtp(email: string, code: string, purpose: 'signup' | 'reset'): Promise<boolean> {
  const ident = identifier(email, purpose)
  const now = new Date()

  await db.delete(verification).where(
    and(eq(verification.identifier, ident), lt(verification.expiresAt, now)),
  )

  const [row] = await db
    .select()
    .from(verification)
    .where(and(
      eq(verification.identifier, ident),
      eq(verification.value, code),
      gte(verification.expiresAt, now),
    ))
    .limit(1)

  if (!row) return false

  await db.delete(verification).where(eq(verification.id, row.id))

  return true
}
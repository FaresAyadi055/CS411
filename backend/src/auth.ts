import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'

import { apiKey } from '@better-auth/api-key'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { authSchema, user } from './db/schema'
import { env } from './config/env'
import { hashPassword, verifyPassword } from './lib/auth-password'
import { generateSecret } from './services/totp'

let _auth: ReturnType<typeof betterAuth> = null as unknown as ReturnType<typeof betterAuth>

export function getAuth(): ReturnType<typeof betterAuth> {
  if (_auth) return _auth

  const socialProviders = {
    ...(env.googleClientId && env.googleClientSecret
      ? {
          google: {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          },
        }
      : {}),
    ...(env.facebookClientId && env.facebookClientSecret
      ? {
          facebook: {
            clientId: env.facebookClientId,
            clientSecret: env.facebookClientSecret,
          },
        }
      : {}),
  }

  _auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    secret: env.betterAuthSecret,
    trustedOrigins: env.disableAuth
      ? ['*']
      : [...env.corsOrigins, env.frontendUrl],
    emailAndPassword: {
      enabled: true,
      password: {
        // SHA-256+salt instead of Argon2id — necessary for Cloudflare Workers
        // free tier (10ms CPU time limit per request). Argon2id would exceed it.
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: false,
    },
    socialProviders,
    account: {
      storeStateStrategy: 'cookie',
    },
    advanced: {
      cookies: {
        session_token: {
          attributes: env.betterAuthUrl.startsWith('https://')
            ? { sameSite: 'strict', secure: true }
            : { sameSite: 'strict' },
        },
        oauth_state: {
          attributes: env.betterAuthUrl.startsWith('https://')
            ? { sameSite: 'none', secure: true }
            : { sameSite: 'lax' },
        },
      },
    },
    plugins: [apiKey()],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'client',
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (authUser) => {
            const totpSecret = generateSecret()
            await db
              .insert(user)
              .values({
                id: authUser.id,
                email: authUser.email,
                role: 'client',
                firstName: authUser.name.split(' ')[0] ?? null,
                lastName: authUser.name.split(' ').slice(1).join(' ') || null,
              })
              .onConflictDoNothing()
            await db
              .update(authSchema.user)
              .set({ totpSecret })
              .where(eq(authSchema.user.id, authUser.id))
          },
        },
      },
    session: {
      create: {
        before: async (sessionData) => {
          const [profile] = await db
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, sessionData.userId))
            .limit(1)
          return {
            data: { ...sessionData, role: profile?.role ?? 'client' },
          }
        },
      },
    },
    },
  }) as unknown as ReturnType<typeof betterAuth>

  return _auth
}

export type Auth = ReturnType<typeof betterAuth>
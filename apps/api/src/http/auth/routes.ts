import type { fastifyTypedInstance } from '../../types.ts'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'
import { forwardToBetterAuth, verifyTurnstileToken } from './forward.ts'

const CreateLoginBodySchema = z.object({
  email: z.string().email(),
  type: z.enum(['sign-in', 'email-verification']).optional(),
  'cf-turnstile-response': z.string().optional(),
})

const VerifyOtpBodySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(1),
})

export default async function authRoutes(app: fastifyTypedInstance) {
  // POST /v1/auth/emailotp → mapeia para /api/auth/email-otp/send-verification-otp
  app.post('/emailotp', {
    schema: {
      tags: ['auth'],
      body: CreateLoginBodySchema,
    },
  }, async (request, reply) => {
    const body = CreateLoginBodySchema.parse(request.body)
    const email = body.email.toLowerCase()

    // Verifica usuário existente (ajustado ao schema local)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(400).send({ error: 'Usuário não encontrado' })
    }

    // Validação opcional do Turnstile
    if (body['cf-turnstile-response']) {
      const ok = await verifyTurnstileToken(body['cf-turnstile-response'])
      if (!ok) return reply.status(400).send({ error: 'Validação Turnstile falhou' })
    }

    const type = body.type ?? 'sign-in'
    return forwardToBetterAuth(request, reply, {
      targetPath: '/api/auth/email-otp/send-verification-otp',
      method: 'POST',
      body: { email, type },
    })
  })

  // POST /v1/auth/sign-in/emailotp → mapeia para /api/auth/sign-in/email-otp
  app.post('/sign-in/emailotp', {
    schema: {
      tags: ['auth'],
      body: VerifyOtpBodySchema,
    },
  }, async (request, reply) => {
    const { email, otp } = VerifyOtpBodySchema.parse(request.body)
    return forwardToBetterAuth(request, reply, {
      targetPath: '/api/auth/sign-in/email-otp',
      method: 'POST',
      body: { email: email.toLowerCase(), otp },
    })
  })

  // POST /v1/auth/logout → mapeia para /api/auth/sign-out
  app.post('/logout', {
    schema: { tags: ['auth'] },
  }, async (request, reply) => {
    return forwardToBetterAuth(request, reply, {
      targetPath: '/api/auth/sign-out',
      method: 'POST',
    })
  })
}



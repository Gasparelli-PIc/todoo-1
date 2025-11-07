import type { fastifyTypedInstance } from '../../types.ts'
import { SignUpBodySchema } from './types.ts'
import { auth } from '../../lib/auth.ts'
import { fromNodeHeaders } from 'better-auth/node'

export default async function signInRoutes(app: fastifyTypedInstance) {
  app.post('/sign-in/email', {
    schema: {
      tags: ['auth'],
      body: SignUpBodySchema,
    },
  }, async (request, reply) => {
    const { name, email, password, image, callbackURL } = SignUpBodySchema.parse(request.body)
    const { headers, response } = await auth.api.signUpEmail({
      body: { name, email: email.toLowerCase(), password, image, callbackURL },
      headers: fromNodeHeaders(request.headers as any),
      returnHeaders: true,
    })
    const cookies = (headers as any).getSetCookie?.()
    if (cookies && cookies.length) reply.header('set-cookie', cookies)
    return reply.send(response)
  })
}


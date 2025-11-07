// ESM
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { validatorCompiler, serializerCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { registerHttp } from './http/index.ts'
import { auth } from './lib/auth.ts'
import middie from '@fastify/middie'
import { toNodeHandler } from 'better-auth/node'

const app = Fastify({logger:true}).withTypeProvider<ZodTypeProvider>() // <- tipagem com Zod 

// Compilers do Zod
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// CORS (libera tudo em dev; restrinja em prod)
await app.register(fastifyCors, {
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(middie)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'todoo-api',
      description: 'API for Todo app',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local dev server',
      },
    ],
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.get('/', () => {
  return { message: 'API is running' }
})

await registerHttp(app)
// CORS + encaminhamento (via middie) antes do roteamento do Fastify
app.use('/api/auth/', (req, res, next) => {
  const origin = 'http://localhost:3000'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  next()
})

app.use('/api/auth', toNodeHandler(auth))


//server
const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001)
    const host = process.env.HOST ?? '0.0.0.0'
    await app.listen({ port, host })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
start()
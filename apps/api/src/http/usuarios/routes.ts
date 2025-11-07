import type { fastifyTypedInstance } from '../../types.ts'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'

export default async function usuariosRoutes(app: fastifyTypedInstance) {
  // Listar usuários (campos essenciais)
  app.get('/users', {
    schema: {
      operationId: 'listUsers',
      description: 'Lista todos os usuários',
      tags: ['usuarios'],
      response: {
        200: z.array(z.object({
          id: z.string(),
          nome: z.string(),
          email: z.string().email(),
        })),
      },
    },
  }, async () => {
    const usuarios = await prisma.user.findMany({
      orderBy: { /* se existir createdAt usa, senão id */ id: 'desc' },
      select: { id: true, nome: true, email: true },
    })
    return usuarios
  })

  // Buscar um usuário por ID
  app.get('/users/:id', {
    schema: {
      operationId: 'getUser',
      description: 'Busca um usuário pelo ID',
      tags: ['usuarios'],
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ id: z.string(), nome: z.string(), email: z.string().email() }),
        404: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const usuario = await prisma.user.findUnique({ where: { id }, select: { id: true, nome: true, email: true } })
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return usuario
  })

  // Criar usuário
  app.post('/users', {
    schema: {
      operationId: 'createUser',
      description: 'Cria um usuário',
      tags: ['usuarios'],
      body: z.object({
        nome: z.string().min(1),
        email: z.string().email(),
        senha: z.string().min(4),
      }),
      response: {
        201: z.object({ id: z.string(), message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { nome, email, senha } = request.body
    const created = await prisma.user.create({ data: { nome, name: nome, email, senha } })
    return reply.status(201).send({ id: created.id, message: 'Usuário criado com sucesso' })
  })

  // Atualizar usuário
  app.put('/users/:id', {
    schema: {
      operationId: 'updateUser',
      description: 'Atualiza um usuário',
      tags: ['usuarios'],
      params: z.object({ id: z.string() }),
      body: z.object({
        nome: z.string().min(1).optional(),
        email: z.string().email().optional(),
        senha: z.string().min(4).optional(),
      }),
      response: {
        200: z.object({ message: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { nome, email, senha } = request.body
    const exists = await prisma.user.findUnique({ where: { id } })
    if (!exists) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.update({ where: { id }, data: { nome, name: nome ?? undefined, email, senha } })
    return { message: 'Usuário atualizado com sucesso' }
  })

  // Deletar usuário
  app.delete('/users/:id', {
    schema: {
      operationId: 'deleteUser',
      description: 'Deleta um usuário',
      tags: ['usuarios'],
      params: z.object({ id: z.string() }),
      response: {
        200: z.object({ message: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const exists = await prisma.user.findUnique({ where: { id } })
    if (!exists) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.delete({ where: { id } })
    return { message: 'Usuário deletado com sucesso' }
  })
}



import type { fastifyTypedInstance } from '../../types.ts'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'
import { randomUUID } from 'node:crypto'

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
      orderBy: { id: 'desc' },
      select: { id: true, name: true, email: true },
    })
    return usuarios.map(u => ({ id: u.id, nome: u.name, email: u.email }))
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
    const usuario = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } })
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return { id: usuario.id, nome: usuario.name, email: usuario.email }
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
      }),
      response: {
        201: z.object({ id: z.string(), message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { nome, email } = request.body
    const created = await prisma.user.create({ data: { id: randomUUID(), name: nome, email } })
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
      }),
      response: {
        200: z.object({ message: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { nome, email } = request.body
    const exists = await prisma.user.findUnique({ where: { id } })
    if (!exists) return reply.status(404).send({ error: 'Usuário não encontrado' })
    await prisma.user.update({ where: { id }, data: { name: nome ?? undefined, email } })
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



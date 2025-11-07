import type { fastifyTypedInstance } from '../../types.ts'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'

export default async function tarefasRoutes(app: fastifyTypedInstance) {
  app.get('/tasks', {
    schema: {
      operationId: 'listTasks',
      description: 'Lista todas as tarefas',
      tags: ['tarefas'],
      response: {
        200: z.array(z.object({
          id: z.string(),
          titulo: z.string(),
          descricao: z.string(),
          completo: z.boolean(),
        })),
      }
    },
  }, async () => {
    const tarefas = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } })
    return tarefas
  })

  app.post('/tasks', {
    schema: {
      operationId: 'createTask',
      description: 'Cria uma nova tarefa',
      tags: ['tarefas'],
      body: z.object({
        titulo: z.string(),
        descricao: z.string(),
        completo: z.boolean(),
      }),
      response: {
        201: z.object({ message: z.string() }).describe('Tarefa criada com sucesso'),
      },
    },
  },async (request, reply) => {
    const { titulo, descricao, completo } = request.body
    // Garante um usuário associado (usa o primeiro disponível, senão cria um padrão)
    let user = await prisma.user.findFirst({ select: { id: true } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          nome: 'Usuário Padrão',
          name: 'Usuário Padrão',
          email: 'default@local',
          senha: 'default',
        },
        select: { id: true },
      })
    }
    await prisma.task.create({
      data: { titulo, descricao, completo, userId: user.id },
    })
    return reply.status(201).send({ message: 'Tarefa criada com sucesso' })
  })

  app.delete('/tasks/:id', {
    schema: {
      operationId: 'deleteTask',
      description: 'Deleta uma tarefa',
      tags: ['tarefas'],
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params
    const tarefa = await prisma.task.findUnique({ where: { id } })
    if (!tarefa) {
      return reply.status(404).send({ error: 'Tarefa não encontrada' })
    }
    await prisma.task.delete({ where: { id } })
    return reply.status(201).send({ message: 'Tarefa deletada com sucesso' })
  })

  app.put('/tasks/:id', {
    schema: {
      operationId: 'updateTask',
      description: 'Atualiza uma tarefa',
      tags: ['tarefas'],
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        titulo : z.string(),
        descricao : z.string(),
        completo : z.boolean()
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { titulo, descricao, completo } = request.body
    const tarefa = await prisma.task.findUnique({ where: { id } })
    if (!tarefa) {
      return reply.status(404).send({ error: 'Tarefa não encontrada' })
    }
    await prisma.task.update({
      where: { id },
      data: { titulo, descricao, completo },
    })
    return reply.status(201).send({ message: 'Tarefa atualizada com exito' })
  })
}

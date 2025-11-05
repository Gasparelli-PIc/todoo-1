import type { fastifyTypedInstance } from '../types.ts'
import { z } from 'zod'
import crypto from 'node:crypto'
// removido import incorreto de 'reply'

interface Tarefa {
  id: string
  titulo: string
  descricao: string
  completo: boolean
}

const tarefas: Tarefa[] = []

export default async function tarefasRoutes(app: fastifyTypedInstance) {
  app.get('/todas-tarefas', {
    schema: {
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
  }, () => {
    return tarefas
  })

  app.post('/adicionar-tarefa', {
    schema: {
      description: 'Cria uma nova tarefa',
      tags: ['tarefas'],
      body: z.object({
        titulo: z.string(),
        descricao: z.string(),
        completo: z.boolean(),
      }),
      response: {
        201: z.null().describe('Tarefa criada com sucesso'),
      },
    },
  },async (request, reply) => {
    const { titulo, descricao, completo } = request.body

    tarefas.push({
      id: crypto.randomUUID(),
      titulo,
      descricao,
      completo,
    })
    return reply.status(201).send(null)
    
  })
}

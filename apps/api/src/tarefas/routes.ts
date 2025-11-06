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

let tarefasList: Tarefa[] = []

export default async function tarefasRoutes(app: fastifyTypedInstance) {
  app.get('/tasks', {
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
    return tarefasList
  })

  app.post('/tasks', {
    schema: {
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

    tarefasList.push({
      id: crypto.randomUUID(),
      titulo,
      descricao,
      completo,
    })
    return reply.status(201).send({ message: 'Tarefa criada com sucesso' })
    
  })

  app.delete('/tasks/:id', {
    schema: {
      description: 'Deleta uma tarefa',
      tags: ['tarefas'],
      params: z.object({
        id: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params
    const tarefa = tarefasList.find((tarefa) => tarefa.id === id)
    if (!tarefa) {
      return reply.status(404).send({ error: 'Tarefa não encontrada' })
    }
    tarefasList = tarefasList.filter((tarefa) => tarefa.id !== id)
    return reply.status(201).send({ message: 'Tarefa deletada com sucesso' })
  })

  app.put('/tasks/:id', {
    schema: {
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
    const tarefa = tarefasList.find((tarefa) => tarefa.id === id)
    if (!tarefa) {
      return reply.status(404).send({ error: 'Tarefa não encontrada' })
    }
    tarefa.titulo = titulo
    tarefa.descricao = descricao
    tarefa.completo = completo
    return reply.status(201).send({message : 'Tarefa atualizada com exito'})
  })
}

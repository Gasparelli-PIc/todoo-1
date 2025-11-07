"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListTasks, listTasksQueryKey } from "../src/generated/useListTasks";
import { useCreateTask } from "../src/generated/useCreateTask";
import { useUpdateTask } from "../src/generated/useUpdateTask";
import { useDeleteTask } from "../src/generated/useDeleteTask";
import { useGetUser } from "../src/generated/useGetUser";
import { authClient } from "../../lib/auth-client";

type UiTask = {
  id: string;
  titulo: string;
  descricao: string;
  completo: boolean;
};

export default function TarefasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Sessão (Better Auth)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: session, isLoading: isSessionLoading } = (authClient as any).useSession?.() ?? { data: null, isLoading: false };

  // Se não houver sessão, redireciona para login
  useEffect(() => {
    if (!isSessionLoading && !session?.user) {
      router.replace("/login?from=/tarefas");
    }
  }, [isSessionLoading, session, router]);

  // Verifica usuário no banco (via API /usuarios/:id)
  const userId = session?.user?.id as string | undefined;
  const userQuery = useGetUser(userId as string, { query: { enabled: !!userId } });

  useEffect(() => {
    if (userId && userQuery.isError) {
      router.replace("/register?from=/tarefas");
    }
  }, [userId, userQuery.isError, router]);

  const { data: tasks = [], isLoading } = useListTasks();

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listTasksQueryKey() }),
    },
  });
  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listTasksQueryKey() }),
    },
  });
  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listTasksQueryKey() }),
    },
  });

  const remainingCount = useMemo(
    () => tasks.filter((t) => !t.completo).length,
    [tasks]
  );

  function addTask() {
    const titulo = newTitle.trim();
    if (!titulo) return;
    const descricao = newDescription.trim();
    createTask.mutate({ data: { titulo, descricao, completo: false } });
    setNewTitle("");
    setNewDescription("");
  }

  function startEdit(task: UiTask) {
    setEditingId(task.id);
    setEditingTitle(task.titulo);
    setEditingDescription(task.descricao ?? "");
  }

  function saveEdit() {
    if (!editingId) return;
    const titulo = editingTitle.trim();
    if (!titulo) return;
    const descricao = editingDescription.trim();
    updateTask.mutate({ id: editingId, data: { titulo, descricao, completo: tasks.find(t => t.id === editingId)?.completo ?? false } });
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function toggleTask(task: UiTask) {
    updateTask.mutate({ id: task.id, data: { titulo: task.titulo, descricao: task.descricao, completo: !task.completo } });
  }

  function removeTask(id: string) {
    deleteTask.mutate({ id });
  }

  function clearCompleted() {
    tasks.filter((t) => t.completo).forEach((t) => deleteTask.mutate({ id: t.id }));
  }

  // Evita piscar conteúdo enquanto valida sessão/usuário
  if (isSessionLoading || (userId && userQuery.isLoading)) {
    return <main className="max-w-3xl mx-auto p-4"><p className="text-muted">Carregando...</p></main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <nav className="text-sm text-muted space-x-4">
          <a className="underline" href="/">Home</a>
          <a className="underline" href="/login">Login</a>
          <a className="underline" href="/register">Registrar</a>
        </nav>
      </header>

      <section aria-label="Criar tarefa" className="grid gap-2 mb-4">
        <input
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-700 px-3 h-10"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Nova tarefa..."
          aria-label="Título da nova tarefa"
        />
        <input
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-700 px-3 h-10"
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Descrição (opcional)"
          aria-label="Descrição da nova tarefa"
        />
        <div>
          <button
            onClick={addTask}
            disabled={createTask.isPending}
            className="h-10 px-4 rounded-md border border-neutral-800 bg-white text-black disabled:opacity-60"
          >
            {createTask.isPending ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </section>

      <section aria-label="Lista de tarefas" className="grid gap-2">
        {isLoading ? (
          <p className="text-muted">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted">Nenhuma tarefa ainda. Adicione a primeira!</p>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              className="flex items-center gap-2 p-3 border border-neutral-800 rounded-lg"
            >
              <input
                type="checkbox"
                checked={task.completo}
                onChange={() => toggleTask(task)}
                aria-label={task.completo ? "Marcar como não concluída" : "Marcar como concluída"}
              />

              <div className="flex-1 grid gap-1">
                {editingId === task.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      aria-label="Editar título da tarefa"
                      placeholder="Título"
                      className="px-2 h-9 rounded-md border border-neutral-800 bg-neutral-950 text-white"
                    />
                    <input
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      aria-label="Editar descrição da tarefa"
                      placeholder="Descrição (opcional)"
                      className="px-2 h-9 rounded-md border border-neutral-800 bg-neutral-950 text-white"
                    />
                  </>
                ) : (
                  <>
                    <span className={(task.completo ? "line-through text-neutral-500 " : "") + "font-medium"}>
                      {task.titulo}
                    </span>
                    {task.descricao ? (
                      <span className="text-neutral-400 text-sm">
                        {task.descricao}
                      </span>
                    ) : null}
                  </>
                )}
              </div>

              {editingId === task.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="px-3 h-9 rounded-md border border-neutral-800 bg-white text-black"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 h-9 rounded-md border border-neutral-800 bg-neutral-900"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(task)}
                    className="px-3 h-9 rounded-md border border-neutral-800 bg-neutral-900"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeTask(task.id)}
                    aria-label="Apagar tarefa"
                    className="px-3 h-9 rounded-md border border-neutral-800 bg-neutral-900 text-red-400"
                  >
                    Apagar
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {tasks.length > 0 && (
        <footer className="flex items-center justify-between mt-4 text-neutral-400">
          <span>{remainingCount} pendente(s)</span>
          <button
            onClick={clearCompleted}
            disabled={tasks.every((t) => !t.completo)}
            className="px-3 h-9 rounded-md border border-neutral-800 bg-neutral-900 disabled:opacity-60"
          >
            Limpar concluídas
          </button>
        </footer>
      )}
    </main>
  );
}



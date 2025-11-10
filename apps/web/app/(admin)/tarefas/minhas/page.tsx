"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../../lib/auth-client";
import { createAbilityFor, subject } from "@repo/auth";
import { useGetUser } from "../../../src/generated/useGetUser";
import { useListTasks, listTasksQueryKey } from "../../../src/generated/useListTasks";
import { useCreateTask } from "../../../src/generated/useCreateTask";
import { useUpdateTask } from "../../../src/generated/useUpdateTask";
import { useDeleteTask } from "../../../src/generated/useDeleteTask";
import { usePostV1AuthLogout } from "../../../src/generated/usePostV1AuthLogout";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";

type UiTask = {
  id: string;
  titulo: string;
  descricao: string;
  completo: boolean;
  userId: string;
};

export default function UserTasksPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const useSession = authClient.useSession;
  const {
    data: session,
    isPending: isSessionPending,
    isRefetching: isSessionRefetching,
  } = useSession?.() ?? { data: undefined, isPending: false, isRefetching: false };
  const isSessionLoading = Boolean(isSessionPending || isSessionRefetching);

  useEffect(() => {
    if (isSessionLoading) return;
    if (session === null) {
      router.replace("/login?from=/tarefas/minhas");
    }
  }, [isSessionLoading, session, router]);

  const userId = session?.user?.id as string | undefined;
  const userQuery = useGetUser(userId ?? "", { query: { enabled: !!userId } });
  const logout = usePostV1AuthLogout();

  // Admin também pode visualizar suas próprias tarefas nesta página,
  // portanto não redirecionamos automaticamente para /tarefas/admin.

  const ability = useMemo(() => {
    if (!userId || !userQuery.data?.role) return createAbilityFor(null);
    return createAbilityFor({ id: userId, role: userQuery.data.role });
  }, [userId, userQuery.data?.role]);

  const tasksQuery = useListTasks(
    userId ? { userId } : undefined,
    {
      query: { enabled: !!userId },
    },
  );

  const tasks = useMemo(() => {
    const raw = tasksQuery.data ?? [];
    return raw as unknown as UiTask[];
  }, [tasksQuery.data]);

  const remainingCount = useMemo(
    () => tasks.filter((task) => !task.completo).length,
    [tasks],
  );

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: listTasksQueryKey({ userId }) });
        setCreateOpen(false);
      },
    },
  });
  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listTasksQueryKey({ userId }) }),
    },
  });
  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listTasksQueryKey({ userId }) }),
    },
  });

  function getTaskById(id: string) {
    return tasks.find((task) => task.id === id);
  }

  function addTask() {
    if (!userId) return;
    if (!ability.can("create", subject("Task", { userId }))) return;
    const titulo = newTitle.trim();
    if (!titulo) return;
    const descricao = newDescription.trim();

    createTask.mutate({ data: { titulo, descricao, completo: false, userId } });
    setNewTitle("");
    setNewDescription("");
  }

  function startEdit(task: UiTask) {
    setEditingId(task.id);
    setEditingTitle(task.titulo);
    setEditingDescription(task.descricao ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function saveEdit() {
    if (!editingId || !userId) return;
    const titulo = editingTitle.trim();
    if (!titulo) return;
    const descricao = editingDescription.trim();
    if (!ability.can("update", subject("Task", { id: editingId, userId }))) return;

    const current = getTaskById(editingId);
    updateTask.mutate({
      id: editingId,
      data: {
        titulo,
        descricao,
        completo: current?.completo ?? false,
        userId,
      },
    });
    cancelEdit();
  }

  function toggleTask(task: UiTask) {
    if (!ability.can("update", subject("Task", { id: task.id, userId: task.userId }))) return;
    updateTask.mutate({
      id: task.id,
      data: {
        titulo: task.titulo,
        descricao: task.descricao,
        completo: !task.completo,
        userId: task.userId,
      },
    });
  }

  function removeTask(id: string) {
    const task = getTaskById(id);
    if (!task) return;
    if (!ability.can("delete", subject("Task", { id: task.id, userId: task.userId }))) return;
    deleteTask.mutate({ id: task.id });
  }

  function clearCompleted() {
    tasks
      .filter((task) => task.completo && ability.can("delete", subject("Task", { id: task.id, userId: task.userId })))
      .forEach((task) => deleteTask.mutate({ id: task.id }));
  }

  const canClearCompleted = tasks.some(
    (task) => task.completo && ability.can("delete", subject("Task", { id: task.id, userId: task.userId })),
  );

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      qc.clear();
      if (typeof window !== "undefined") {
        window.location.replace("/login?from=/tarefas");
      } else {
        router.replace("/login");
        router.refresh();
      }
    }
  }

  if (isSessionLoading || userQuery.isLoading) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <p className="text-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="h-12 items-center px-0">
          <CardTitle className="text-lg font-medium row-span-2 self-center">Adicionar nova tarefa</CardTitle>
          <CardAction>
            <Button onClick={() => setCreateOpen(true)}>Nova tarefa</Button>
          </CardAction>
        </CardHeader>
      </Card>
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
            className="grid gap-3"
          >
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da tarefa"
              required
            />
            <Input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descrição (opcional)"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createTask.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="grid gap-2">
        <header className="flex items-center justify-between">
          <span className="text-sm text-neutral-400">
            {remainingCount} tarefa(s) pendente(s)
          </span>
          <Button onClick={clearCompleted} disabled={!canClearCompleted} variant="outline" size="sm">
            Limpar concluídas
          </Button>
        </header>

        {tasksQuery.isLoading ? (
          <p className="text-muted">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted">Nenhuma tarefa ainda. Adicione a primeira!</p>
        ) : (
          tasks.map((task) => {
            const canUpdate = ability.can("update", subject("Task", { id: task.id, userId: task.userId }));
            const canDelete = ability.can("delete", subject("Task", { id: task.id, userId: task.userId }));
            const isEditing = editingId === task.id;

            return (
              <article
                key={task.id}
                className="flex items-start gap-3 rounded-lg border border-neutral-800 p-4"
              >
                <input
                  type="checkbox"
                  checked={task.completo}
                  onChange={() => toggleTask(task)}
                  disabled={!canUpdate}
                  className="mt-1"
                  aria-label={task.completo ? "Marcar como não concluída" : "Marcar como concluída"}
                />
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <>
                      <Input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-9"
                      />
                      <Input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-9"
                        placeholder="Descrição"
                      />
                    </>
                  ) : (
                    <>
                      <h3 className={(task.completo ? "line-through text-neutral-500 " : "") + "font-medium"}>
                        {task.titulo}
                      </h3>
                      {task.descricao ? (
                        <p className="text-sm text-neutral-400">{task.descricao}</p>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={saveEdit} size="sm">
                        Salvar
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => startEdit(task)}
                        disabled={!canUpdate}
                        variant="outline"
                        size="sm"
                      >
                        Editar
                      </Button>
                      <Button
                        onClick={() => removeTask(task.id)}
                        disabled={!canDelete}
                        variant="outline"
                        size="sm"
                        className="text-red-400"
                      >
                        Apagar
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}



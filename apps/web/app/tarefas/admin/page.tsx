"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth-client";
import { createAbilityFor, subject } from "../../../lib/ability";
import { useGetUser } from "../../src/generated/useGetUser";
import { useListUsers } from "../../src/generated/useListUsers";
import { useListTasks, listTasksQueryKey } from "../../src/generated/useListTasks";
import { useCreateTask } from "../../src/generated/useCreateTask";
import { useUpdateTask } from "../../src/generated/useUpdateTask";
import { useDeleteTask } from "../../src/generated/useDeleteTask";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

type UiTask = {
  id: string;
  titulo: string;
  descricao: string;
  completo: boolean;
  userId: string;
  owner?: {
    id: string;
    nome: string | null;
    email: string;
    role: "ADMIN" | "USER";
  };
};

type UiUser = {
  id: string;
  nome: string;
  email: string;
  role: "ADMIN" | "USER";
};

export default function AdminTasksPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOwnerId, setNewOwnerId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);

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
      router.replace("/login?from=/tarefas/admin");
    }
  }, [isSessionLoading, session, router]);

  const userId = session?.user?.id as string | undefined;
  const userQuery = useGetUser(userId ?? "", { query: { enabled: !!userId } });

  useEffect(() => {
    if (userQuery.isLoading) return;
    const role = userQuery.data?.role;
    if (userQuery.isError || role !== "ADMIN") {
      router.replace("/tarefas/minhas");
    }
  }, [userQuery.isLoading, userQuery.isError, userQuery.data?.role, router]);

  const ability = useMemo(() => {
    if (!userId) return createAbilityFor(null);
    return createAbilityFor({ id: userId, role: "ADMIN" });
  }, [userId]);

  const usersQuery = useListUsers({
    query: { enabled: userQuery.data?.role === "ADMIN" },
  });

  const availableUsers = useMemo(() => {
    const raw = usersQuery.data ?? [];
    return raw as unknown as UiUser[];
  }, [usersQuery.data]);

  useEffect(() => {
    if (!newOwnerId && userId) {
      setNewOwnerId(userId);
    }
  }, [newOwnerId, userId]);

  useEffect(() => {
    if (!newOwnerId && availableUsers.length > 0) {
      setNewOwnerId(availableUsers[0]?.id);
    }
  }, [availableUsers, newOwnerId]);

  const tasksQuery = useListTasks(undefined, {
    query: {
      enabled: Boolean(userId && userQuery.data?.role === "ADMIN"),
    },
  });

  const tasks = useMemo(() => {
    const raw = tasksQuery.data ?? [];
    return raw as unknown as UiTask[];
  }, [tasksQuery.data]);

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

  function getTaskById(id: string) {
    return tasks.find((task) => task.id === id);
  }

  function addTask() {
    const titulo = newTitle.trim();
    if (!titulo) return;
    const descricao = newDescription.trim();
    const ownerId = newOwnerId;
    if (!ownerId) return;
    if (!ability.can("create", subject("Task", { userId: ownerId }))) return;

    createTask.mutate({ data: { titulo, descricao, completo: false, userId: ownerId } });
    setNewTitle("");
    setNewDescription("");
  }

  function startEdit(task: UiTask) {
    setEditingId(task.id);
    setEditingTitle(task.titulo);
    setEditingDescription(task.descricao ?? "");
    setEditingOwnerId(task.userId);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
    setEditingOwnerId(null);
  }

  function saveEdit() {
    if (!editingId) return;
    const titulo = editingTitle.trim();
    if (!titulo) return;
    const descricao = editingDescription.trim();
    const ownerId = editingOwnerId ?? getTaskById(editingId)?.userId;
    if (!ownerId) return;
    if (!ability.can("update", subject("Task", { id: editingId, userId: ownerId }))) return;

    const current = getTaskById(editingId);
    updateTask.mutate({
      id: editingId,
      data: {
        titulo,
        descricao,
        completo: current?.completo ?? false,
        userId: ownerId,
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

  if (isSessionLoading || userQuery.isLoading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <Card aria-label="Criar tarefa" className="grid gap-3 p-4">
        <h2 className="text-lg font-medium">Criar nova tarefa</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-400">Título</span>
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
              }}
              placeholder="Nova tarefa..."
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-400">Responsável</span>
            <Select value={newOwnerId ?? ""} onValueChange={(v) => setNewOwnerId(v || undefined)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {(user.nome || user.email) ?? user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-neutral-400">Descrição</span>
          <Input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrição (opcional)"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={addTask} disabled={createTask.isPending || !newOwnerId}>
            {createTask.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </Card>

      <section aria-label="Lista completa de tarefas" className="rounded-lg border border-neutral-800 overflow-hidden">
        <header className="flex items-center justify-between bg-neutral-950/80 px-4 py-3">
          <div>
            <h2 className="text-lg font-medium">Todas as tarefas</h2>
            <p className="text-xs text-neutral-500">{tasks.length} registro(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/tarefas/minhas")}
              title="Ver apenas as minhas tarefas"
            >
              Minhas tarefas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tasks
                .filter((task) => task.completo && ability.can("delete", subject("Task", { id: task.id, userId: task.userId })))
                .forEach((task) => deleteTask.mutate({ id: task.id }))}
              disabled={!tasks.some((task) => task.completo && ability.can("delete", subject("Task", { id: task.id, userId: task.userId })))}
            >
              Limpar concluídas
            </Button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tasksQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    Carregando...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    Nenhuma tarefa cadastrada até o momento.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const canUpdate = ability.can("update", subject("Task", { id: task.id, userId: task.userId }));
                  const canDelete = ability.can("delete", subject("Task", { id: task.id, userId: task.userId }));

                  const isEditing = editingId === task.id;
                  return (
                    <tr key={task.id} className="border-t border-neutral-800">
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full h-9"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        ) : (
                          <div className="font-medium">{task.titulo}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <Input
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full h-9"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        ) : (
                          <span className="text-neutral-400">
                            {task.descricao || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <Select
                            value={editingOwnerId ?? ""}
                            onValueChange={(v) => setEditingOwnerId(v)}
                          >
                            <SelectTrigger className="w-full h-9" />
                            <SelectContent>
                              {availableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {(user.nome || user.email) ?? user.email} ({user.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-neutral-300">
                            <div>{task.owner?.nome || task.owner?.email || "Sem usuário"}</div>
                            <span className="text-xs uppercase text-neutral-500">{task.owner?.role ?? "N/A"}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Button
                          onClick={() => toggleTask(task)}
                          disabled={!canUpdate}
                          variant="outline"
                          size="sm"
                        >
                          {task.completo ? "Concluída" : "Pendente"}
                        </Button>
                      </td>
                      <td className="px-4 py-3 align-top text-right space-y-2">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button onClick={saveEdit} size="sm">
                              Salvar
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" size="sm">
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
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
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}



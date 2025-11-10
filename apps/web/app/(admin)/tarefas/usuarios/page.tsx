"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../../lib/auth-client";
import { useGetUser } from "../../../src/generated/useGetUser";
import { useListUsers, listUsersQueryKey } from "../../../src/generated/useListUsers";
import { useDeleteUser } from "../../../src/generated/useDeleteUser";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { usePostV1AuthSignInEmail } from "../../../src/generated/usePostV1AuthSignInEmail";
import client from "../../../src/generated/.kubb/fetcher";
import { axiosInstance } from "../../../src/generated/.kubb/fetcher";
import type { RequestConfig } from "../../../src/generated/.kubb/fetcher";
import { useUpdateUser } from "../../../src/generated/useUpdateUser";
import { useState, useCallback } from "react";

type UiUser = {
  id: string;
  nome: string;
  email: string;
  role: "ADMIN" | "USER";
};

export default function UsuariosAdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      router.replace("/login?from=/tarefas/usuarios");
    }
  }, [isSessionLoading, session, router]);

  const userId = session?.user?.id as string | undefined;
  const meQuery = useGetUser(userId ?? "", { query: { enabled: !!userId } });

  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.isError || meQuery.data?.role !== "ADMIN") {
      router.replace("/tarefas/minhas");
    }
  }, [meQuery.isLoading, meQuery.isError, meQuery.data?.role, router]);

  const usersQuery = useListUsers({
    query: { enabled: meQuery.data?.role === "ADMIN" },
  });
  const deleteUser = useDeleteUser({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: listUsersQueryKey() }),
    },
  });
  const updateUser = useUpdateUser();

  // cliente sem credenciais para registrar sem afetar a sessão atual
  const noCredentialsClient: typeof client = (((cfg: RequestConfig<unknown>) => {
    const prev = axiosInstance.defaults.withCredentials;
    axiosInstance.defaults.withCredentials = false;
    return client(cfg).finally(() => {
      axiosInstance.defaults.withCredentials = prev;
    });
  }) as typeof client);
  noCredentialsClient.getConfig = client.getConfig;
  noCredentialsClient.setConfig = client.setConfig;
  const signUp = usePostV1AuthSignInEmail({ client: { client: noCredentialsClient } });

  if (isSessionLoading || meQuery.isLoading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-muted">Carregando...</p>
      </main>
    );
  }

  const users = useMemo(() => ((usersQuery.data ?? []) as unknown as UiUser[]), [usersQuery.data]);

  function handleDelete(id: string) {
    if (!id) return;
    // evita apagar a si mesmo inadvertidamente
    if (id === (userId ?? "")) {
      // opcionalmente poderíamos permitir, mas melhor evitar
      return;
    }
    const ok = typeof window !== "undefined" ? window.confirm("Apagar este usuário?") : true;
    if (!ok) return;
    deleteUser.mutate({ id });
  }

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setEmail("");
    setPassword("");
    setConfirm("");
    setRole("USER");
    setError(null);
  }, []);

  async function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const fallbackName = email.split("@")[0] || "Usuário";
      const response = await signUp.mutateAsync({
        data: { name: fallbackName, email, password, role },
      });
      if (role === "ADMIN") {
        const createdUserId = (response as { user?: { id?: string | null } } | undefined)?.user?.id;
        if (createdUserId) {
          await updateUser.mutateAsync({ id: createdUserId, data: { role } });
        }
      }
      await qc.invalidateQueries({ queryKey: listUsersQueryKey() });
      closeCreate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível criar o usuário.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="h-12 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Usuários</h2>
            <p className="text-muted text-sm">
              {usersQuery.isLoading ? "Carregando..." : `${users.length} registro(s)`}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Novo usuário</Button>
        </div>
      </Card>

      <section className="rounded-lg border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-neutral-800">
                    <td className="px-4 py-3 align-top">{u.nome || "—"}</td>
                    <td className="px-4 py-3 align-top">{u.email}</td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs uppercase text-neutral-500">{u.role}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <code className="text-xs text-neutral-500">{u.id}</code>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteUser.isPending || u.id === userId}
                          title={u.id === userId ? "Você não pode apagar a si mesmo" : "Apagar usuário"}
                        >
                          Apagar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateSubmit} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="new-confirm">Confirmar senha</Label>
              <Input
                id="new-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="new-role">Tipo de usuário</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "USER")}>
                <SelectTrigger id="new-role" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário comum</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-red-500 text-sm">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreate} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



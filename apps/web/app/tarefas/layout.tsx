"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../lib/auth-client";
import { useGetUser } from "../src/generated/useGetUser";
import { usePostV1AuthLogout } from "../src/generated/usePostV1AuthLogout";
import { Button } from "../../components/ui/button";
import { useTheme } from "../providers";
import { Moon, Sun } from "lucide-react";

export default function TarefasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();

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
      router.replace("/login?from=/tarefas");
    }
  }, [isSessionLoading, session, router]);

  const userId = session?.user?.id as string | undefined;
  const userQuery = useGetUser(userId ?? "", { query: { enabled: !!userId } });
  const role = userQuery.data?.role;

  const logout = usePostV1AuthLogout();
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

  const navItems = useMemo(() => {
    const base = [{ href: "/tarefas/minhas", label: "Minhas tarefas" as const }];
    if (role === "ADMIN") {
      base.push({ href: "/tarefas/admin", label: "Painel Admin" as const });
      base.push({ href: "/register?from=/tarefas/admin", label: "Novo usuário" as const });
    }
    return base;
  }, [role]);

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/tarefas/minhas") return pathname.startsWith("/tarefas/minhas");
    if (href === "/tarefas/admin") return pathname.startsWith("/tarefas/admin");
    return pathname === href;
  }

  const { theme, toggleTheme } = useTheme();

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="sticky top-0 z-10 mb-6 border-b border-neutral-800 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/tarefas/minhas" className="text-xl font-semibold">
              TODOO
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "rounded-md px-3 py-1.5 border " +
                    (isActive(item.href)
                      ? "border-neutral-600 bg-neutral-900"
                      : "border-transparent hover:border-neutral-700 hover:bg-neutral-900")
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              aria-label="Alternar tema"
              title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              onClick={handleLogout}
              disabled={logout.isPending}
              variant="outline"
              size="sm"
            >
              {logout.isPending ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </main>
  );
}



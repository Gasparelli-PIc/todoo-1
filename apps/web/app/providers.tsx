"use client"

import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { setConfig, axiosInstance } from "./src/generated/.kubb/fetcher"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  const stored = window.localStorage.getItem("theme")
  if (stored === "light" || stored === "dark") return stored
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  return prefersDark ? "dark" : "light"
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient())
  // Configure o client ANTES de montar filhos, evitando primeira requisição sem baseURL
  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
  setConfig({ baseURL })
  axiosInstance.defaults.withCredentials = true
  const [theme, setThemeState] = useState<Theme>(() => (typeof window === "undefined" ? "dark" : getInitialTheme()))
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    // Sync theme on mount (SSR may not know user preference)
    const next = getInitialTheme()
    setThemeState(next)
    applyThemeClass(next)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", t)
    }
    applyThemeClass(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within AppProviders")
  return ctx
}



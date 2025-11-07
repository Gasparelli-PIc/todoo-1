import { createAuthClient } from "better-auth/react"

// Tipagem explícita e estável para evitar referência a tipos internos do pacote
type PublicAuthClient = {
  useSession?: (...args: any[]) => any
  signIn?: any
  signUp?: any
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
}) as PublicAuthClient

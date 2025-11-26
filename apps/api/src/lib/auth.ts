import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.ts";

const defaultPort = Number(process.env.PORT ?? 3001);
const defaultBaseURL = `http://localhost:${defaultPort}/api/auth`;

// 1. DETECÇÃO DE PRODUÇÃO
// Verifica se estamos rodando no servidor (Render) ou no computador local
const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  // Tenta usar a variável do Render (BETTER_AUTH_URL) primeiro
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.AUTH_BASE_URL ?? defaultBaseURL,
  
  trustedOrigins: [
    process.env.WEB_APP_URL ?? "http://localhost:3000",
    // Adiciona a variável FRONTEND_URL que configuramos no Render
    process.env.FRONTEND_URL ?? "", 
  ],
  
  advanced: {
    // 2. COOKIES DINÂMICOS
    // Em Produção (HTTPS), obriga o uso de cookies seguros
    useSecureCookies: isProduction, 
    
    defaultCookieAttributes: {
      path: "/",
      // O SEGREDO: 'none' permite cookies entre Back (Render) e Front (Vercel)
      // 'lax' funciona apenas em localhost
      sameSite: isProduction ? "none" : "lax", 
      secure: isProduction,
      httpOnly: true,
    },
    // Reforça a configuração para o token de sessão específico
    cookies: {
      session_token: {
        attributes: {
          path: "/",
          sameSite: isProduction ? "none" : "lax",
          secure: isProduction,
        },
      },
    },
  },
  
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});
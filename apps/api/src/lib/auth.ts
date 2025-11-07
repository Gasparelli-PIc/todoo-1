import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.ts";


export const auth = betterAuth({
    baseURL: `http://localhost:${process.env.PORT ?? 3001}/api/auth`,
    trustedOrigins: [
        'http://localhost:3000',
    ],
    database: prismaAdapter(prisma, {
        provider: "postgresql",   
    }),
    emailAndPassword: { 
        enabled: true, 
        requireEmailVerification: false,
    }, 
});
import { betterAuth } from "better-auth";
impo

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "sqlite", 
});
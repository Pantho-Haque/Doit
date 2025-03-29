// apps/backend/src/trpc.ts
import { PrismaClient } from "@repo/prisma/client";
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const prisma = new PrismaClient();
const t = initTRPC.create();

export const appRouter = t.router({
  getTodos: t.procedure.query(async () => {
    return await prisma.todo.findMany();
  }),

  addTodo: t.procedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.todo.create({
        data: { title: input.title, completed: false },
      });
    }),

  updateTodo: t.procedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.todo.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  deleteTodo: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.todo.delete({
        where: { id: input.id },
      });
    }),

  toggleTodo: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const todo = await prisma.todo.findUnique({ where: { id: input.id } });
      if (!todo) throw new Error("Todo not found");
      return await prisma.todo.update({
        where: { id: input.id },
        data: { completed: !todo.completed },
      });
    }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;

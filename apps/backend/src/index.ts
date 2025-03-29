// apps/backend/src/index.ts
import * as trpcExpress from "@trpc/server/adapters/express";
import express, { Request, Response } from "express";
import { appRouter } from "./utils/trpc.js";
import cors from "cors";

// created for each request
const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({}); // no context
type Context = Awaited<ReturnType<typeof createContext>>;

const app = express();

app.use(cors())

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}), // You can add context here if needed
  })
);

app.use("/", (req: Request, res: Response) => {
  res.send("Hello from tRPC backend");
});

const port = 4000;
app.listen(port, () => {
  console.log("ok")
  console.log(`Server is running on http://localhost:${port}`);
});

export type { AppRouter as TServerRouter } from "./utils/trpc.js";
//

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
// import superjson from 'superjson';
// import { createTRPCClient } from '@trpc/client';
import type { TServerRouter } from "backend";

// export const trpc = createTRPCReact<TServerRouter>();
// export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCProxyClient<TServerRouter>({
  links: [
    httpBatchLink({
      // use your API URL (could be an env var for monorepo flexibility)
      url: process.env.NEXT_PUBLIC_TRPC_URL ?? "http://localhost:4000/trpc",
      // transformer: superjson,  // match the transformer used on the server (e.g., SuperJSON)
    }),
  ],
});

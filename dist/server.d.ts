import { Hono } from "hono";
declare const app: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
declare let botStatus: {
    isReady: boolean;
    lastActivity: Date;
    errorCount: number;
};
export declare function updateBotStatus(status: Partial<typeof botStatus>): void;
export default app;
//# sourceMappingURL=server.d.ts.map
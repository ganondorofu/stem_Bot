"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const app = new hono_1.Hono();
// ヘルスチェック用のエンドポイント
app.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "Discord Bot is running",
        node_version: process.version,
        timestamp: new Date().toISOString(),
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map
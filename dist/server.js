"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBotStatus = updateBotStatus;
const hono_1 = require("hono");
const app = new hono_1.Hono();
// ボットの状態を追跡
let botStatus = {
    isReady: false,
    lastActivity: new Date(),
    errorCount: 0
};
// ボット状態を更新する関数をエクスポート
function updateBotStatus(status) {
    botStatus = { ...botStatus, ...status };
}
// ヘルスチェック用のエンドポイント
app.get("/", (c) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    return c.json({
        status: "ok",
        message: "Discord Bot is running",
        node_version: process.version,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)}分${Math.floor(uptime % 60)}秒`,
        bot_ready: botStatus.isReady,
        last_activity: botStatus.lastActivity,
        error_count: botStatus.errorCount,
        memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB"
        }
    });
});
// ヘルスチェック詳細エンドポイント
app.get("/health", (c) => {
    const isHealthy = botStatus.isReady && (Date.now() - botStatus.lastActivity.getTime()) < 300000; // 5分以内
    return c.json({
        healthy: isHealthy,
        bot_ready: botStatus.isReady,
        last_activity: botStatus.lastActivity,
        uptime: process.uptime()
    }, isHealthy ? 200 : 503);
});
exports.default = app;
//# sourceMappingURL=server.js.map
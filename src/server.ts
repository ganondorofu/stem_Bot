import { Hono } from "hono";

const app = new Hono();

// ボットの状態を追跡
let botStatus = {
  isReady: false,
  lastActivity: new Date(),
  errorCount: 0,
  startTime: new Date()
};

// ボット状態を更新する関数をエクスポート
export function updateBotStatus(status: Partial<typeof botStatus>) {
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
    start_time: botStatus.startTime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
      usage_percent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + "%"
    },
    environment: {
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    }
  });
});

// ヘルスチェック詳細エンドポイント
app.get("/health", (c) => {
  const isHealthy = botStatus.isReady && (Date.now() - botStatus.lastActivity.getTime()) < 300000; // 5分以内
  const memoryUsage = process.memoryUsage();
  const memoryHealthy = (memoryUsage.heapUsed / memoryUsage.heapTotal) < 0.9; // 90%未満
  
  const overallHealthy = isHealthy && memoryHealthy;
  
  return c.json({
    healthy: overallHealthy,
    checks: {
      bot_ready: botStatus.isReady,
      recent_activity: isHealthy,
      memory_healthy: memoryHealthy,
      error_count_ok: botStatus.errorCount < 10
    },
    last_activity: botStatus.lastActivity,
    uptime: process.uptime(),
    memory_usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + "%"
  }, overallHealthy ? 200 : 503);
});

// 簡易的なメトリクスエンドポイント
app.get("/metrics", (c) => {
  const memoryUsage = process.memoryUsage();
  return c.json({
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    memory: {
      heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memoryUsage.external / 1024 / 1024),
      rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    bot: {
      ready: botStatus.isReady,
      errors: botStatus.errorCount,
      last_activity: botStatus.lastActivity
    }
  });
});

export default app;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHealthCheckCron = startHealthCheckCron;
const node_cron_1 = __importDefault(require("node-cron"));
const config_1 = require("./config");
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || `http://localhost:${config_1.PORT}`;
let consecutiveFailures = 0;
// 10分ごとにヘルスチェックを実行
function startHealthCheckCron() {
    node_cron_1.default.schedule("*/10 * * * *", async () => {
        try {
            const now = new Date().toLocaleString('ja-JP');
            console.log(`🔍 [${now}] ヘルスチェック実行中... (${HEALTH_CHECK_URL})`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
            const response = await fetch(HEALTH_CHECK_URL, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'STEM-Bot-HealthCheck/1.0'
                }
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                console.log(`✅ [${now}] ヘルスチェック成功: ${response.status}`);
                consecutiveFailures = 0;
            }
            else {
                consecutiveFailures++;
                console.warn(`⚠️ [${now}] ヘルスチェック失敗: ${response.status} (連続失敗: ${consecutiveFailures})`);
                if (consecutiveFailures >= 3) {
                    console.error(`❌ [${now}] 連続でヘルスチェックが失敗しています。システムに問題がある可能性があります。`);
                }
            }
        }
        catch (error) {
            consecutiveFailures++;
            const now = new Date().toLocaleString('ja-JP');
            if (error.name === 'AbortError') {
                console.error(`❌ [${now}] ヘルスチェックタイムアウト (連続失敗: ${consecutiveFailures})`);
            }
            else {
                console.error(`❌ [${now}] ヘルスチェックエラー (連続失敗: ${consecutiveFailures}):`, error.message);
            }
            if (consecutiveFailures >= 5) {
                console.error(`🚨 [${now}] 重大: 5回連続でヘルスチェックが失敗しました。`);
            }
        }
    });
    console.log("🕐 ヘルスチェックの定期実行を開始しました (10分間隔)");
}
//# sourceMappingURL=cron.js.map
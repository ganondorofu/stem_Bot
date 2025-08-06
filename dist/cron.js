"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHealthCheckCron = startHealthCheckCron;
const node_cron_1 = __importDefault(require("node-cron"));
const config_1 = require("./config");
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || `http://localhost:${config_1.PORT}`;
// 10分ごとにヘルスチェックを実行
function startHealthCheckCron() {
    node_cron_1.default.schedule("*/10 * * * *", async () => {
        try {
            const now = new Date().toLocaleString('ja-JP');
            console.log(`🔍 [${now}] ヘルスチェック実行中... (${HEALTH_CHECK_URL})`);
            const response = await fetch(HEALTH_CHECK_URL);
            if (response.ok) {
                console.log(`✅ [${now}] ヘルスチェック成功: ${response.status}`);
            }
            else {
                console.warn(`⚠️ [${now}] ヘルスチェック失敗: ${response.status}`);
            }
        }
        catch (error) {
            const now = new Date().toLocaleString('ja-JP');
            console.error(`❌ [${now}] ヘルスチェックエラー:`, error);
        }
    });
    console.log("🕐 ヘルスチェックの定期実行を開始しました (10分間隔)");
}
//# sourceMappingURL=cron.js.map
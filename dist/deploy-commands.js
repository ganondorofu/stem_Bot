"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('name')
        .setDescription('自分のニックネームを部活のルールに合わせて設定します。')
        .toJSON(),
];
const rest = new discord_js_1.REST().setToken(process.env.DISCORD_TOKEN);
async function deployCommands() {
    try {
        console.log('スラッシュコマンドの登録を開始します...');
        const data = await rest.put(discord_js_1.Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log(`${data.length}個のスラッシュコマンドを正常に登録しました。`);
    }
    catch (error) {
        console.error('スラッシュコマンドの登録でエラーが発生しました:', error);
    }
}
deployCommands();
//# sourceMappingURL=deploy-commands.js.map
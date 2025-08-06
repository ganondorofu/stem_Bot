import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName('name')
        .setDescription('自分のニックネームを部活のルールに合わせて設定します。')
        .toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

async function deployCommands() {
    try {
        console.log('スラッシュコマンドの登録を開始します...');

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
            { body: commands },
        );

        console.log(`${(data as any[]).length}個のスラッシュコマンドを正常に登録しました。`);
    } catch (error) {
        console.error('スラッシュコマンドの登録でエラーが発生しました:', error);
    }
}

deployCommands();

import { 
    Client, 
    GatewayIntentBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    InteractionType,
    ModalActionRowComponentBuilder,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
    Interaction
} from 'discord.js';
import dotenv from 'dotenv';
import { serve } from "@hono/node-server";
import healthCheckServer from "./server";
import { startHealthCheckCron } from "./cron";
import { PORT } from "./config";

dotenv.config();

interface Config {
    token: string;
    guildId: string;
    currentMemberRoleId: string;
    obRoleId: string;
}

interface ValidationResult {
    isValid: boolean;
    error?: string;
}

// ボットクライアントの作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// 設定
const config: Config = {
    token: process.env.DISCORD_TOKEN!,
    guildId: process.env.GUILD_ID!,
    currentMemberRoleId: process.env.CURRENT_MEMBER_ROLE_ID!,
    obRoleId: process.env.OB_ROLE_ID!
};

// ボットの準備完了時の処理
client.once('ready', () => {
    console.log(`${client.user!.tag} がログインしました！`);
    console.log('スラッシュコマンドを使用するには、先に deploy-commands.ts を実行してください。');
});

// インタラクションの処理
client.on('interactionCreate', async (interaction: Interaction) => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'name') {
            await handleNameCommand(interaction);
        } else if (interaction.isModalSubmit() && interaction.customId === 'nickname_modal') {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        console.error('インタラクション処理中にエラーが発生しました:', error);
        
        const errorMessage = 'コマンド処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。';
        
        if (interaction.isRepliable()) {
            if (interaction.replied || interaction.deferred) {
                const followUp = await interaction.followUp({ content: errorMessage, ephemeral: true });
                // 15秒後にフォローアップメッセージを削除
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        // メッセージがすでに削除されている場合はエラーを無視
                    }
                }, 15000);
            } else {
                const reply = await interaction.reply({ content: errorMessage, ephemeral: true });
                // 15秒後にメッセージを削除
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        // メッセージがすでに削除されている場合はエラーを無視
                    }
                }, 15000);
            }
        }
    }
});

// /nameコマンドの処理
async function handleNameCommand(interaction: ChatInputCommandInteraction) {
    // モーダルの作成
    const modal = new ModalBuilder()
        .setCustomId('nickname_modal')
        .setTitle('ニックネーム設定');

    // 本名入力フィールド
    const nameInput = new TextInputBuilder()
        .setCustomId('real_name')
        .setLabel('本名（スペースなし）')
        .setPlaceholder('本名をスペースなしで入力してください（例：山田太郎）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

    // 学籍番号/期生入力フィールド
    const idInput = new TextInputBuilder()
        .setCustomId('student_id_or_generation')
        .setLabel('学籍番号または期生（数字のみ）')
        .setPlaceholder('学籍番号または期生を数字のみで入力（例：12345 または 5）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    // アクションローの作成
    const nameRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nameInput);
    const idRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(idInput);

    modal.addComponents(nameRow, idRow);

    // モーダルを表示
    await interaction.showModal(modal);
}

// モーダル送信の処理
async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    const realName: string = interaction.fields.getTextInputValue('real_name').trim();
    const studentIdOrGeneration: string = interaction.fields.getTextInputValue('student_id_or_generation').trim();

    // 本名のスペースチェック
    if (realName.includes(' ') || realName.includes('　')) {
        const reply = await interaction.reply({
            content: '本名はスペースなしで入力してください。',
            ephemeral: true
        });
        // 10秒後にメッセージを削除
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 10000);
        return;
    }

    // 学籍番号/期生が数字のみかチェック
    if (!/^\d+$/.test(studentIdOrGeneration)) {
        const reply = await interaction.reply({
            content: '学籍番号または期生は数字のみで入力してください。',
            ephemeral: true
        });
        // 10秒後にメッセージを削除
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 10000);
        return;
    }

    // ユーザーのロールを取得
    const member = interaction.member;
    if (!member || !interaction.guild) {
        const reply = await interaction.reply({
            content: 'メンバー情報を取得できませんでした。',
            ephemeral: true
        });
        // 10秒後にメッセージを削除
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 10000);
        return;
    }

    // GuildMemberオブジェクトを取得
    const guildMember = await interaction.guild.members.fetch(interaction.user.id);
    const userRoles = guildMember.roles.cache;

    let isAlumni = false;
    let isCurrentMember = false;

    // ロール判定
    if (userRoles.has(config.obRoleId)) {
        isAlumni = true;
    } else if (userRoles.has(config.currentMemberRoleId)) {
        isCurrentMember = true;
    }

    // ロールチェック
    if (!isAlumni && !isCurrentMember) {
        const reply = await interaction.reply({
            content: 'ニックネーム設定には、現役部員またはOBのロールが必要です。',
            ephemeral: true
        });
        // 15秒後にメッセージを削除
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 15000);
        return;
    }

    let nickname: string;
    let validationResult: ValidationResult;

    if (isAlumni) {
        // OBの場合：期生の検証
        validationResult = validateGeneration(studentIdOrGeneration);
        if (!validationResult.isValid) {
            const reply = await interaction.reply({
                content: 'OBの方は期生を2以上の数字で入力してください。',
                ephemeral: true
            });
            // 10秒後にメッセージを削除
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (error) {
                    // メッセージがすでに削除されている場合はエラーを無視
                }
            }, 10000);
            return;
        }
        nickname = `${realName}(第${studentIdOrGeneration}期卒業生)`;
    } else {
        // 現役部員の場合：学籍番号の検証
        validationResult = validateStudentId(studentIdOrGeneration);
        if (!validationResult.isValid) {
            const reply = await interaction.reply({
                content: '現役部員の方は学籍番号を10101から30940の範囲で入力してください。',
                ephemeral: true
            });
            // 10秒後にメッセージを削除
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (error) {
                    // メッセージがすでに削除されている場合はエラーを無視
                }
            }, 10000);
            return;
        }
        nickname = `${realName}(${studentIdOrGeneration})`;
    }

    // ニックネームの設定
    try {
        await guildMember.setNickname(nickname);
        const reply = await interaction.reply({
            content: `ニックネームを**\`${nickname}\`**に変更しました。`,
            ephemeral: true
        });
        // 30秒後にメッセージを削除（成功メッセージは少し長めに表示）
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 30000);
    } catch (error: any) {
        console.error('ニックネーム設定エラー:', error);
        
        let errorMessage = 'ニックネームの設定に失敗しました。';
        
        if (error.code === 50013) {
            errorMessage = 'ニックネームを変更する権限がありません。ボットの権限設定を確認してください。';
        } else if (error.code === 50035) {
            errorMessage = 'ニックネームが長すぎます。より短い名前をお試しください。';
        }
        
        const reply = await interaction.reply({
            content: errorMessage,
            ephemeral: true
        });
        // 20秒後にメッセージを削除
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // メッセージがすでに削除されている場合はエラーを無視
            }
        }, 20000);
    }
}

// 期生の検証
function validateGeneration(input: string): ValidationResult {
    const generation = parseInt(input, 10);
    
    if (isNaN(generation)) {
        return { isValid: false, error: '数字で入力してください。' };
    }
    
    if (generation < 2) {
        return { isValid: false, error: '期生は2以上の数字で入力してください。' };
    }
    
    return { isValid: true };
}

// 学籍番号の検証
function validateStudentId(input: string): ValidationResult {
    const studentId = parseInt(input, 10);
    
    if (isNaN(studentId)) {
        return { isValid: false, error: '数字で入力してください。' };
    }
    
    if (studentId < 10101 || studentId > 30940) {
        return { isValid: false, error: '学籍番号は10101から30940の範囲で入力してください。' };
    }
    
    return { isValid: true };
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    console.error('未処理のPromise拒否:', error);
});

process.on('uncaughtException', (error) => {
    console.error('未処理の例外:', error);
    process.exit(1);
});

// ボットの起動
client.login(config.token);

// Koyeb用のヘルスチェックサーバーを起動
serve({
  fetch: healthCheckServer.fetch,
  port: Number(PORT),
});

// ヘルスチェックcronを開始
startHealthCheckCron();

console.log(`🚀 Discord Bot started with health check server on port ${PORT}`);

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
import healthCheckServer, { updateBotStatus } from "./server";
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

// パフォーマンス監視
let lastMemoryCleanup = Date.now();
function checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    console.log(`メモリ使用量: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`);

    // メモリ使用率が80%を超えた場合、ガベージコレクションを実行
    if (usagePercent > 80 && Date.now() - lastMemoryCleanup > 60000) { // 1分間のクールダウン
        console.log("メモリ使用率が高いため、ガベージコレクションを実行します");
        if (global.gc) {
            global.gc();
            lastMemoryCleanup = Date.now();
            const afterGC = process.memoryUsage();
            console.log(`GC後のメモリ使用量: ${Math.round(afterGC.heapUsed / 1024 / 1024)}MB`);
        }
    }
}

// 定期的なメモリチェック（5分ごと）
setInterval(checkMemoryUsage, 5 * 60 * 1000);

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
    const startTime = new Date();
    console.log(`🚀 ${client.user!.tag} がログインしました！`);
    console.log(`📊 起動時刻: ${startTime.toLocaleString('ja-JP')}`);
    console.log(`🏢 サーバー数: ${client.guilds.cache.size}`);
    console.log(`👥 ユーザー数: ${client.users.cache.size}`);
    console.log(`💾 Node.js バージョン: ${process.version}`);
    console.log(`🔧 Discord.js バージョン: ${require('discord.js').version}`);
    console.log('📋 スラッシュコマンドを使用するには、先に deploy-commands.ts を実行してください。');
    
    // 初回メモリチェック
    checkMemoryUsage();
    
    // ボット状態を更新
    updateBotStatus({ 
        isReady: true, 
        lastActivity: new Date(),
        errorCount: 0,
        startTime: startTime
    });
});

// インタラクションの処理
client.on('interactionCreate', async (interaction: Interaction) => {
    // 活動時刻を更新
    updateBotStatus({ lastActivity: new Date() });
    
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'name') {
            await handleNameCommand(interaction);
        } else if (interaction.isModalSubmit() && interaction.customId === 'nickname_modal') {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        console.error('インタラクション処理中にエラーが発生しました:', error);
        
        // エラーカウントを増加
        updateBotStatus({ errorCount: (global as any).errorCount + 1 });
        
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
    updateBotStatus({ errorCount: (global as any).errorCount + 1 });
});

process.on('uncaughtException', (error) => {
    console.error('未処理の例外:', error);
    updateBotStatus({ errorCount: (global as any).errorCount + 1 });
    
    // 重大なエラーの場合は再起動を試みる
    setTimeout(() => {
        console.log('プロセスを再起動しています...');
        process.exit(1);
    }, 5000);
});

// SIGTERM/SIGINTハンドリング（Koyebでの停止処理）
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Gracefully shutting down...');
    updateBotStatus({ isReady: false });
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Gracefully shutting down...');
    updateBotStatus({ isReady: false });
    client.destroy();
    process.exit(0);
});

// 定期的なメモリ使用量チェック
setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // より詳細なメモリログ
    console.log(`📊 メモリ使用量: ${heapUsedMB}MB / ${heapTotalMB}MB (使用率: ${Math.round((heapUsedMB/heapTotalMB)*100)}%)`);
    
    if (heapUsedMB > 400) { // 400MB超過時に警告
        console.warn(`⚠️ メモリ使用量が高いです: ${heapUsedMB}MB`);
    }
    
    if (heapUsedMB > 450) { // 450MB超過時に緊急措置
        console.error(`🚨 メモリ使用量が危険域です: ${heapUsedMB}MB - ガベージコレクションを強制実行`);
        if (global.gc) {
            global.gc();
            console.log('🧹 緊急ガベージコレクションを実行しました');
        }
    }
    
    // ガベージコレクションを強制実行（メモリ不足対策）
    if (global.gc && heapUsedMB > 300) {
        global.gc();
        const newMemUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`🧹 ガベージコレクション実行: ${heapUsedMB}MB → ${newMemUsage}MB`);
    }
}, 60000); // 1分間隔

// アップタイム監視
setInterval(() => {
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
    console.log(`⏰ 稼働時間: ${uptimeHours}時間${uptimeMinutes}分`);
}, 3600000); // 1時間間隔でアップタイムログ

// ボットの起動
client.login(config.token);

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
    console.error('💥 未処理の例外:', error);
    updateBotStatus({ errorCount: (process as any).errorCount + 1 });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 未処理のPromise拒否:', reason);
    updateBotStatus({ errorCount: (process as any).errorCount + 1 });
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
    console.log('🛑 シャットダウンシグナルを受信しました...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 終了シグナルを受信しました...');
    client.destroy();
    process.exit(0);
});

// Koyeb用のヘルスチェックサーバーを起動
try {
    serve({
        fetch: healthCheckServer.fetch,
        port: Number(PORT),
    });
    console.log(`🚀 Discord Bot started with health check server on port ${PORT}`);
} catch (error) {
    console.error(`❌ ヘルスチェックサーバーの起動に失敗: ${error}`);
    console.log(`🔄 ポート ${PORT} が使用中の可能性があります`);
}

// ヘルスチェックcronを開始
startHealthCheckCron();

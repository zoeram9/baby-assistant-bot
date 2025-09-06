require('dotenv').config();
console.log("Token:", process.env.BOT_TOKEN ? "Loaded ✅" : "Not found ❌");


const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);


bot.start((ctx) => ctx.reply('سلام! 👶 به بات دستیار مادران خوش اومدی.'));
bot.on('text', (ctx) => ctx.reply(`دریافت شد: ${ctx.message.text}`));

bot.launch();

console.log("Bot is running...");

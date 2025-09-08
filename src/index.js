require('dotenv').config({ path: '../.env' });
console.log('Token:', process.env.BOT_TOKEN ? 'Loaded ✅' : 'Not found ❌');

const { Telegraf, Markup, Scenes, session } = require('telegraf');
const fs = require('fs');

const messages = {
  fa: { welcome: "سلام! من دستیار مادران هستم. چطور می‌توانم کمکتان کنم؟" },
  tr: { welcome: "Merhaba! Ben anne asistanıyım. Size nasıl yardımcı olabilirim?" }
};

const LANG_FILE = '../userLanguages.json';
const USER_FILE = '../users.json';

// ----- کمک کننده ها برای ذخیره/خواندن -----
function readLanguages() {
  if (!fs.existsSync(LANG_FILE)) return {};
  return JSON.parse(fs.readFileSync(LANG_FILE, 'utf-8'));
}
function saveLanguage(chatId, lang) {
  const languages = readLanguages();
  languages[chatId] = lang;
  fs.writeFileSync(LANG_FILE, JSON.stringify(languages, null, 2));
}

function readUsers() {
  if (!fs.existsSync(USER_FILE)) return {};
  return JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'));
}
function saveUser(chatId, data) {
  const users = readUsers();
  users[chatId] = data;
  fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

// ----- ساخت Wizard ثبت نام -----
const registerWizard = new Scenes.WizardScene(
  'register-wizard',
  // مرحله 1: انتخاب زبان
  (ctx) => {
    ctx.reply(
      "لطفاً زبان خود را انتخاب کنید / Lütfen dilinizi seçin",
      Markup.inlineKeyboard([
        Markup.button.callback('فارسی', 'lang_fa'),
        Markup.button.callback('Türkçe', 'lang_tr')
      ])
    );
    return ctx.wizard.next();
  },
  // مرحله 2: نام نوزاد
  (ctx) => {
    ctx.wizard.state.lang = ctx.callbackQuery?.data === 'lang_fa' ? 'fa' : 'tr';
    saveLanguage(ctx.chat.id, ctx.wizard.state.lang);
    ctx.answerCbQuery();
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "نام نوزاد را وارد کنید:" : "Bebeğin adını girin:");
    return ctx.wizard.next();
  },
  // مرحله 3: روز تولد
  (ctx) => {
    ctx.wizard.state.name = ctx.message.text;
    const days = Array.from({length: 31}, (_, i) => Markup.button.callback((i+1).toString(), `day_${i+1}`));
    ctx.reply(
      ctx.wizard.state.lang === 'fa' ? "روز تولد را انتخاب کنید:" : "Günü seçin:",
      Markup.inlineKeyboard(days, {columns: 7})
    );
    return ctx.wizard.next();
  },
  // مرحله 4: ماه تولد
  (ctx) => {
    ctx.wizard.state.day = parseInt(ctx.callbackQuery.data.replace('day_', ''));
    ctx.answerCbQuery();
    const months = [
      'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
      'مهر','آبان','آذر','دی','بهمن','اسفند'
    ];
    const monthButtons = months.map((m,i) => Markup.button.callback(m, `month_${i+1}`));
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "ماه تولد را انتخاب کنید:" : "Ayı seçin:", Markup.inlineKeyboard(monthButtons, {columns:3}));
    return ctx.wizard.next();
  },
  // مرحله 5: سال تولد
  (ctx) => {
    ctx.wizard.state.month = parseInt(ctx.callbackQuery.data.replace('month_', ''));
    ctx.answerCbQuery();
    const years = [1400,1401,1402,1403,1404,1405].map(y => Markup.button.callback(y.toString(), `year_${y}`));
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "سال تولد را انتخاب کنید:" : "Yılı seçin:", Markup.inlineKeyboard(years, {columns:3}));
    return ctx.wizard.next();
  },
  // مرحله 6: جنسیت
  (ctx) => {
    ctx.wizard.state.year = parseInt(ctx.callbackQuery.data.replace('year_', ''));
    ctx.answerCbQuery();
    ctx.reply(
      ctx.wizard.state.lang === 'fa' ? "جنسیت نوزاد را انتخاب کنید:" : "Bebeğin cinsiyetini seçin:",
      Markup.inlineKeyboard([
        Markup.button.callback(ctx.wizard.state.lang === 'fa' ? 'پسر' : 'Erkek', 'gender_m'),
        Markup.button.callback(ctx.wizard.state.lang === 'fa' ? 'دختر' : 'Kız', 'gender_f')
      ])
    );
    return ctx.wizard.next();
  },
  // مرحله 7: وزن هنگام تولد
  (ctx) => {
    ctx.wizard.state.gender = ctx.callbackQuery.data === 'gender_m' ? 'مرد' : 'زن';
    ctx.answerCbQuery();
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "وزن هنگام تولد (کیلوگرم) را وارد کنید:" : "Doğum kilosunu girin (kg):");
    return ctx.wizard.next();
  },
  // مرحله 8: قد هنگام تولد
  (ctx) => {
    ctx.wizard.state.birthWeight = ctx.message.text;
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "قد هنگام تولد (سانتیمتر) را وارد کنید:" : "Doğum boyunu girin (cm):");
    return ctx.wizard.next();
  },
  // مرحله 9: وزن کنونی
  (ctx) => {
    ctx.wizard.state.birthHeight = ctx.message.text;
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "وزن کنونی نوزاد (کیلوگرم) را وارد کنید:" : "Bebeğin mevcut kilosunu girin (kg):");
    return ctx.wizard.next();
  },
  // مرحله آخر: ذخیره و پایان
  (ctx) => {
    ctx.wizard.state.currentWeight = ctx.message.text;
    saveUser(ctx.chat.id, ctx.wizard.state);
    ctx.reply(ctx.wizard.state.lang === 'fa' ? "ثبت نام با موفقیت انجام شد ✅" : "Kayıt başarıyla tamamlandı ✅");
    return ctx.scene.leave();
  }
);

// ----- تنظیم بات -----
const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Scenes.Stage([registerWizard]);
bot.use(session());
bot.use(stage.middleware());

// ----- شروع بات -----
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  const users = readUsers();
  if (!users[chatId]) {
    ctx.scene.enter('register-wizard');
  } else {
    const lang = readLanguages()[chatId] || 'fa';
    ctx.reply(messages[lang].welcome);
  }
});

bot.launch().then(() => console.log("Bot is running locally..."));

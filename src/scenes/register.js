const { Scenes, Markup } = require("telegraf");
const { saveUser } = require("../storage");
const messages = require("../messages");

// --- سال‌ها و ماه‌ها ---
const years = [1401, 1402, 1403, 1404];
const months = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر',
  'آبان','آذر','دی','بهمن','اسفند'
];

// --- تابع محاسبه تعداد روزهای ماه ---
function getDays(monthIndex) {
  const days31 = [0,1,2,3,4,5,6]; // ماه‌های 31 روزه
  const days30 = [7,8,9,10];      // ماه‌های 30 روزه
  if(days31.includes(monthIndex)) return 31;
  if(days30.includes(monthIndex)) return 30;
  return 29; // اسفند ساده
}

// --- ویزارد ثبت‌نام ---
const registerWizard = new Scenes.WizardScene(
  "register-wizard",

  // Step 1: نام نوزاد
  (ctx) => {
    ctx.reply(messages.fa.enterName);
    return ctx.wizard.next();
  },

  // Step 2: انتخاب سال تولد
  (ctx) => {
    ctx.wizard.state.name = ctx.message.text;
    ctx.reply("سال تولد را انتخاب کنید:", Markup.inlineKeyboard(
      years.map(y => [Markup.button.callback(y.toString(), `year_${y}`)])
    ));
    return ctx.wizard.next();
  },

  // Step 3: انتخاب ماه تولد
  (ctx) => {
    if(ctx.callbackQuery && ctx.callbackQuery.data.startsWith("year_")) {
      ctx.wizard.state.birthYear = ctx.callbackQuery.data.split("_")[1];
      ctx.answerCbQuery();
    }
    ctx.reply("ماه تولد را انتخاب کنید:", Markup.inlineKeyboard(
      months.map((m,i) => [Markup.button.callback(m, `month_${i}`)])
    ));
    return ctx.wizard.next();
  },

  // Step 4: انتخاب روز تولد
  (ctx) => {
    if(ctx.callbackQuery && ctx.callbackQuery.data.startsWith("month_")) {
      ctx.wizard.state.birthMonth = ctx.callbackQuery.data.split("_")[1];
      ctx.answerCbQuery();
    }
    const daysCount = getDays(parseInt(ctx.wizard.state.birthMonth));
    const dayButtons = [];
    for(let d=1; d<=daysCount; d++) dayButtons.push(Markup.button.callback(d.toString(), `day_${d}`));
    const keyboard = [];
    while(dayButtons.length) keyboard.push(dayButtons.splice(0,6));
    ctx.reply("روز تولد را انتخاب کنید:", Markup.inlineKeyboard(keyboard));
    return ctx.wizard.next();
  },

  // Step 5: ثبت روز و انتخاب جنسیت
  (ctx) => {
    if(ctx.callbackQuery && ctx.callbackQuery.data.startsWith("day_")) {
      ctx.wizard.state.birthDay = ctx.callbackQuery.data.split("_")[1];
      ctx.answerCbQuery();
    }
    ctx.reply("جنسیت نوزاد را انتخاب کنید:", Markup.inlineKeyboard([
      [Markup.button.callback("👶 پسر","gender_male"), Markup.button.callback("👧 دختر","gender_female")]
    ]));
    return ctx.wizard.next();
  },

  // Step 6: ثبت جنسیت و وزن تولد
  (ctx) => {
    if(ctx.callbackQuery && ctx.callbackQuery.data.startsWith("gender_")) {
      ctx.wizard.state.gender = ctx.callbackQuery.data.replace("gender_","");
      ctx.answerCbQuery();
    }
    ctx.reply("وزن هنگام تولد (کیلوگرم) را وارد کنید:");
    return ctx.wizard.next();
  },

  // Step 7: قد تولد
  (ctx) => {
    ctx.wizard.state.birthWeight = ctx.message.text;
    ctx.reply("قد هنگام تولد (سانتیمتر) را وارد کنید:");
    return ctx.wizard.next();
  },

  // Step 8: وزن فعلی
  (ctx) => {
    ctx.wizard.state.birthHeight = ctx.message.text;
    ctx.reply("وزن فعلی (کیلوگرم) را وارد کنید:");
    return ctx.wizard.next();
  },

  // Step 9: قد فعلی و ذخیره
  (ctx) => {
    ctx.wizard.state.currentWeight = ctx.message.text;
    ctx.reply("قد فعلی (سانتیمتر) را وارد کنید:");
    return ctx.wizard.next();
  },

  (ctx) => {
    ctx.wizard.state.currentHeight = ctx.message.text;

    // ساخت تاریخ تولد کامل
    ctx.wizard.state.birthDate = `${ctx.wizard.state.birthYear}-${parseInt(ctx.wizard.state.birthMonth)+1}-${ctx.wizard.state.birthDay}`;

    // ذخیره اطلاعات کاربر
    saveUser(ctx.chat.id, ctx.wizard.state);

    ctx.reply(messages.fa.registerDone, Markup.keyboard([["👤 پروفایل","✏️ ویرایش پروفایل"]]).resize());
    return ctx.scene.leave();
  }
);

module.exports = registerWizard;

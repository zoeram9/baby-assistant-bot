require('dotenv').config({ path: '../.env' });
console.log('Token:', process.env.BOT_TOKEN ? 'Loaded ✅' : 'Not found ❌');

const { Telegraf, Markup, Scenes, session } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getMessage } = require('./messages');

const USERS_FILE = path.join(__dirname, '../users.json');

// تابع‌های کمکی برای مدیریت فایل کاربران
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading users file:', error);
    return {};
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users file:', error);
  }
}

function getUserProfile(user) {
  const lang = user.lang || 'fa';
  return `
${getMessage(lang, 'profile_title')}
${getMessage(lang, 'name')}: ${user.name}
${getMessage(lang, 'birth_date')}: ${user.birthDate}
${getMessage(lang, 'gender')}: ${user.gender}
${getMessage(lang, 'birth_weight')}: ${user.birthWeight}${getMessage(lang, 'kg')}
${getMessage(lang, 'birth_height')}: ${user.birthHeight}${getMessage(lang, 'cm')}
${getMessage(lang, 'current_weight')}: ${user.currentWeight}${getMessage(lang, 'kg')}
${getMessage(lang, 'language')}: ${lang === 'fa' ? 'فارسی' : 'Türkçe'}
`;
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// منوی اصلی دو زبانه
function getMainMenu(lang) {
  return Markup.keyboard([
    [
      getMessage(lang, 'profile'),
      getMessage(lang, 'edit_profile')
    ],
    [
      getMessage(lang, 'features'),
      getMessage(lang, 'settings')
    ],
    [
      getMessage(lang, 'change_language')
    ]
  ]).resize();
}

// تعریف صحنه Wizard برای ثبت‌نام
const registerWizard = new Scenes.WizardScene(
  'register-wizard',
  (ctx) => {
    const users = readUsers();
    const user = users[ctx.chat.id];
    const lang = user?.lang || 'fa';
    
    ctx.reply(getMessage(lang, 'name'));
    ctx.wizard.state.data = { lang };
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.name = ctx.message.text;
    const lang = ctx.wizard.state.data.lang;
    
    // نمایش دکمه‌های سال
    const years = getMessage(lang, 'years');
    const yearButtons = years.map(year => [Markup.button.callback(year, `year_${year}`)]);
    
    ctx.reply(getMessage(lang, 'select_year'), Markup.inlineKeyboard(yearButtons));
    return ctx.wizard.next();
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const year = ctx.callbackQuery.data.replace('year_', '');
      ctx.wizard.state.data.birthYear = year;
      ctx.answerCbQuery();
      
      const lang = ctx.wizard.state.data.lang;
      const months = getMessage(lang, 'months');
      const monthButtons = [];
      
      // 4 تا دکمه در هر ردیف
      for (let i = 0; i < months.length; i += 4) {
        monthButtons.push(
          months.slice(i, i + 4).map((month, index) => 
            Markup.button.callback(month, `month_${i + index + 1}`)
          )
        );
      }
      
      ctx.reply(getMessage(lang, 'select_month'), Markup.inlineKeyboard(monthButtons));
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const monthIndex = parseInt(ctx.callbackQuery.data.replace('month_', '')) - 1;
      const lang = ctx.wizard.state.data.lang;
      const months = getMessage(lang, 'months');
      ctx.wizard.state.data.birthMonth = months[monthIndex];
      ctx.answerCbQuery();
      
      // نمایش دکمه‌های روز
      const days = getMessage(lang, 'days');
      const dayButtons = [];
      
      for (let i = 0; i < days.length; i += 7) {
        dayButtons.push(
          days.slice(i, i + 7).map((day, index) => 
            Markup.button.callback(day, `day_${i + index + 1}`)
          )
        );
      }
      
      ctx.reply(getMessage(lang, 'select_day'), Markup.inlineKeyboard(dayButtons));
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const dayIndex = parseInt(ctx.callbackQuery.data.replace('day_', '')) - 1;
      const lang = ctx.wizard.state.data.lang;
      const days = getMessage(lang, 'days');
      ctx.wizard.state.data.birthDay = days[dayIndex];
      ctx.answerCbQuery();
      
      // ذخیره تاریخ کامل
      const { birthYear, birthMonth, birthDay } = ctx.wizard.state.data;
      ctx.wizard.state.data.birthDate = `${birthYear}-${birthMonth}-${birthDay}`;
      
      // ادامه به جنسیت
      ctx.reply(getMessage(lang, 'gender'), Markup.inlineKeyboard([
        [
          Markup.button.callback(getMessage(lang, 'boy'), 'gender_boy'),
          Markup.button.callback(getMessage(lang, 'girl'), 'gender_girl')
        ]
      ]));
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const lang = ctx.wizard.state.data.lang;
      ctx.wizard.state.data.gender = ctx.callbackQuery.data === 'gender_boy' ? 
        getMessage(lang, 'boy') : getMessage(lang, 'girl');
      ctx.answerCbQuery();
      ctx.reply(getMessage(lang, 'birth_weight'));
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    ctx.wizard.state.data.birthWeight = ctx.message.text;
    const lang = ctx.wizard.state.data.lang;
    ctx.reply(getMessage(lang, 'birth_height'));
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.birthHeight = ctx.message.text;
    const lang = ctx.wizard.state.data.lang;
    ctx.reply(getMessage(lang, 'current_weight'));
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.data.currentWeight = ctx.message.text;
    const userData = ctx.wizard.state.data;
    const users = readUsers();
    
    users[ctx.chat.id] = { 
      ...userData, 
      active: true,
      lang: userData.lang || 'fa'
    };
    
    saveUsers(users);
    ctx.reply(
      `✅ ${getMessage(userData.lang, 'language_changed').replace('✅ ', '')}\n${getUserProfile(users[ctx.chat.id])}`,
      getMainMenu(userData.lang)
    );
    return ctx.scene.leave();
  }
);

// تعریف صحنه Wizard برای ویرایش پروفایل
const editProfileWizard = new Scenes.WizardScene(
  'edit-profile-wizard',
  (ctx) => {
    const users = readUsers();
    const user = users[ctx.chat.id];
    const lang = user?.lang || 'fa';
    
    ctx.reply(getMessage(lang, 'edit_what'), Markup.inlineKeyboard([
      [Markup.button.callback(getMessage(lang, 'name'), 'edit_name')],
      [Markup.button.callback(getMessage(lang, 'birth_date'), 'edit_birthDate')],
      [Markup.button.callback(getMessage(lang, 'gender'), 'edit_gender')],
      [Markup.button.callback(getMessage(lang, 'birth_weight'), 'edit_birthWeight')],
      [Markup.button.callback(getMessage(lang, 'birth_height'), 'edit_birthHeight')],
      [Markup.button.callback(getMessage(lang, 'current_weight'), 'edit_currentWeight')]
    ]));
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const users = readUsers();
      const user = users[ctx.chat.id];
      const lang = user?.lang || 'fa';
      
      const editType = ctx.callbackQuery.data.replace('edit_', '');
      ctx.wizard.state.editType = editType;
      ctx.answerCbQuery();
      
      const prompts = {
        name: getMessage(lang, 'name'),
        birthDate: getMessage(lang, 'birth_date'),
        birthWeight: getMessage(lang, 'birth_weight'),
        birthHeight: getMessage(lang, 'birth_height'),
        currentWeight: getMessage(lang, 'current_weight')
      };
      
      if (editType === 'gender') {
        ctx.reply(getMessage(lang, 'gender'), Markup.inlineKeyboard([
          [
            Markup.button.callback(getMessage(lang, 'boy'), 'new_gender_boy'),
            Markup.button.callback(getMessage(lang, 'girl'), 'new_gender_girl')
          ]
        ]));
      } else {
        ctx.reply(prompts[editType]);
      }
      return ctx.wizard.next();
    }
  },
  (ctx) => {
    const users = readUsers();
    const user = users[ctx.chat.id];
    const lang = user?.lang || 'fa';
    const editType = ctx.wizard.state.editType;
    
    if (editType === 'gender' && ctx.callbackQuery) {
      user.gender = ctx.callbackQuery.data === 'new_gender_boy' ? 
        getMessage(lang, 'boy') : getMessage(lang, 'girl');
      ctx.answerCbQuery();
    } else if (ctx.message && ctx.message.text) {
      user[editType] = ctx.message.text;
    }
    
    users[ctx.chat.id] = user;
    saveUsers(users);
    
    ctx.reply(`✅ \n${getUserProfile(user)}`, getMainMenu(lang));
    return ctx.scene.leave();
  }
);

// تعریف صحنه تغییر زبان
const languageWizard = new Scenes.WizardScene(
  'language-wizard',
  (ctx) => {
    const users = readUsers();
    const user = users[ctx.chat.id];
    const currentLang = user?.lang || 'fa';
    
    ctx.reply(
      getMessage(currentLang, 'choose_language'),
      Markup.inlineKeyboard([
        [
          Markup.button.callback('فارسی 🇮🇷', 'lang_fa'),
          Markup.button.callback('Türkçe 🇹🇷', 'lang_tr')
        ]
      ])
    );
    return ctx.wizard.next();
  },
  (ctx) => {
    if (ctx.callbackQuery) {
      const newLang = ctx.callbackQuery.data === 'lang_fa' ? 'fa' : 'tr';
      const users = readUsers();
      let user = users[ctx.chat.id];
      
      if (!user) {
        user = { lang: newLang, active: false };
      } else {
        user.lang = newLang;
      }
      
      users[ctx.chat.id] = user;
      saveUsers(users);
      
      ctx.answerCbQuery();
      ctx.reply(
        getMessage(newLang, 'language_changed'),
        getMainMenu(newLang)
      );
      return ctx.scene.leave();
    }
  }
);

const stage = new Scenes.Stage([registerWizard, editProfileWizard, languageWizard]);
bot.use(session());
bot.use(stage.middleware());

// شروع بات
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  const users = readUsers();
  
  if (users[chatId] && users[chatId].active) {
    const user = users[chatId];
    const welcomeMessage = getMessage(user.lang, 'welcome_back').replace('{name}', user.name);
    ctx.reply(welcomeMessage, getMainMenu(user.lang));
  } else {
    const user = users[chatId] || { lang: 'fa' };
    ctx.reply(
      getMessage(user.lang, 'welcome_with_name'),
      Markup.keyboard([
        [getMessage(user.lang, 'change_language')],
        ['/register']
      ]).resize()
    );
  }
});

// دستورات
bot.command('register', (ctx) => ctx.scene.enter('register-wizard'));
bot.command('profile', (ctx) => showUserProfile(ctx));
bot.command('edit', (ctx) => ctx.scene.enter('edit-profile-wizard'));
bot.command('language', (ctx) => ctx.scene.enter('language-wizard'));

// نمایش پروفایل کاربر
function showUserProfile(ctx) {
  const users = readUsers();
  const user = users[ctx.chat.id];
  
  if (user && user.active) {
    ctx.reply(getUserProfile(user), getMainMenu(user.lang));
  } else {
    const lang = user?.lang || 'fa';
    ctx.reply(getMessage(lang, 'not_registered'), getMainMenu(lang));
  }
}

// مدیریت پیام‌های متنی
bot.on('text', (ctx) => {
  const users = readUsers();
  const user = users[ctx.chat.id];
  const lang = user?.lang || 'fa';
  const text = ctx.message.text;

  if (!user || !user.active) {
    if (text === getMessage(lang, 'change_language')) {
      return ctx.scene.enter('language-wizard');
    }
    return ctx.reply(getMessage(lang, 'not_registered'));
  }

  switch (text) {
    case getMessage(lang, 'profile'):
      showUserProfile(ctx);
      break;
    case getMessage(lang, 'edit_profile'):
      ctx.scene.enter('edit-profile-wizard');
      break;
    case getMessage(lang, 'features'):
      ctx.reply(getMessage(lang, 'features_text'), getMainMenu(lang));
      break;
    case getMessage(lang, 'settings'):
      ctx.reply(getMessage(lang, 'settings_text'), getMainMenu(lang));
      break;
    case getMessage(lang, 'change_language'):
      ctx.scene.enter('language-wizard');
      break;
    default:
      ctx.reply(getMessage(lang, 'not_registered'), getMainMenu(lang));
  }
});

bot.launch().then(() => console.log("Bot is running with Multi-language Support..."));

// مدیریت خطاها
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
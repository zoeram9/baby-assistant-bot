const fs = require("fs");
const path = require("path");

// مسیر مطلق فایل‌ها نسبت به storage.js
const LANG_FILE = path.join(__dirname, "..", "userLanguages.json");
const USER_FILE = path.join(__dirname, "..", "users.json");

// مدیریت زبان
function readLanguages() {
  if (!fs.existsSync(LANG_FILE)) return {};
  return JSON.parse(fs.readFileSync(LANG_FILE, "utf-8"));
}
function saveLanguage(chatId, lang) {
  const languages = readLanguages();
  languages[chatId] = lang;
  fs.writeFileSync(LANG_FILE, JSON.stringify(languages, null, 2));
}

// مدیریت کاربران
function readUsers() {
  if (!fs.existsSync(USER_FILE)) return {};
  return JSON.parse(fs.readFileSync(USER_FILE, "utf-8"));
}
function saveUser(chatId, data) {
  const users = readUsers();
  users[chatId] = { ...(users[chatId] || {}), ...data };
  fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

module.exports = { readLanguages, saveLanguage, readUsers, saveUser };

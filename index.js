const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");
require("dotenv").config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const allowedChannel = process.env.ID_CHANNEL;
const apiKey = process.env.OPENROUTER_KEY;
const apiURL = process.env.OPENROUTER_API;

const historyFile = "chat-history.json";
let allowedUsers = [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load history
let history = {};
if (fs.existsSync(historyFile)) {
  try {
    history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  } catch {
    history = {};
  }
}

// Slash command: /help
const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Hướng dẫn sử dụng bot ChatGPT!")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("✅ Slash command /help đã đăng ký!");
  } catch (error) {
    console.error("❌ Lỗi khi đăng slash command:", error);
  }
})();

// Gửi yêu cầu đến OpenRouter
async function askGPT(userId, prompt) {
  const messages = history[userId] || [
    { role: "system", content: "Bạn là một trợ lý AI nói tiếng Việt." },
  ];

  messages.push({ role: "user", content: prompt });

  const response = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://yourdomain.com",
      "X-Title": "ChatGPT-Smart-Bot",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini", // dùng model nhẹ
      messages,
    }),
  });

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    const reply = data.choices[0].message.content;
    messages.push({ role: "assistant", content: reply });
    history[userId] = messages.slice(-10); // lưu tối đa 10 lượt chat
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    return reply;
  } else {
    return "❌ Lỗi từ mô hình AI.";
  }
}

// Khi bot sẵn sàng
client.once("ready", () => {
  console.log(`🤖 Bot đã online với tên: ${client.user.tag}`);
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "help") {
    return interaction.reply("📘 Để bắt đầu, bạn hãy **@tên bot** rồi nhắn tin. Sau khi @bot một lần, bạn có thể nhắn tiếp mà không cần @ nữa.");
  }
});

// Tin nhắn
client.on("messageCreate", async (message) => {
  if (
    message.author.bot ||
    message.channel.id !== allowedChannel
  ) return;

  const botMentioned = message.mentions.has(client.user);

  if (botMentioned && !allowedUsers.includes(message.author.id)) {
    allowedUsers.push(message.author.id);
    await message.reply("✅ Bạn đã kích hoạt chat với bot. Giờ có thể nhắn thoải mái!");
    return;
  }

  if (allowedUsers.includes(message.author.id)) {
    const content = message.content.replace(`<@${client.user.id}>`, "").trim();
    if (content.length === 0) return;

    await message.channel.sendTyping();
    try {
      const reply = await askGPT(message.author.id, content);
      message.reply(reply);
    } catch (err) {
      message.reply("❌ Đã xảy ra lỗi: " + err.message);
    }
  }
});

client.login(token);

const path = require("path");
const tmi = require("tmi.js");
require("dotenv").config({ path: path.resolve(__dirname, "../../env/.env") });
const commands = require("../interactions/commands");
const { addBits, init } = require("../database/db");

const prefix = "!";

const bot = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.BOT_ID,
    password: process.env.TWITCH_OAUTH,
  },
  channels: ["natsu30fps"],
});

bot.connect().catch((err) => {
  console.error("Failed to connect to Twitch:", err);
});

init().catch((err) => {
  console.error("Failed to initialize database:", err);
});

bot.on("connected", () => {
  bot.say("natsu30fps", "aaaaaa");
});

bot.on("message", async (channel, tags, message, self) => {
  if (self) return;
  if (!message.startsWith(prefix)) return;

  const args = message.slice(1).split(" ");
  const commandName = args.shift().toLowerCase();

  if (commands[commandName]) {
    try {
      await commands[commandName].execute(bot, channel, tags, args);
    } catch (err) {
      console.error(`Error executing command ${commandName}:`, err);
    }
  }
});

bot.on("cheer", async (channel, tags, message, self) => {
  if (self) return;

  const bits = Number(tags.bits) || 0;
  if (bits > 0) {
    try {
      await addBits(tags["user-id"], tags.username, bits);
    } catch (err) {
      console.error("Error updating bits:", err);
    }
  }
});

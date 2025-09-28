/*
bot -  Client (30fps)
channel - channel the message is being sent
tags - tags like badges, username, user info pretty much
args - is an array with words AFTER the command
*/
const {
  roll,
  resetFreeRoll,
  giveRoll,
  getViewerById,
  insertUser,
  hasRolled,
  rollCost,
  avaiableRolls,
} = require("../database/db");
const { ballResponse } = require("./8ball.js");

module.exports = {
  /*
  checks if the user has rolled {
    roll()
    rolled = true
    }
  checks if the user 'has bits' in the database { 
    roll()
    removes bits from database
    }
  */
  roll: {
    description: "rolls a number",
    async execute(bot, channel, tags, args) {
      try {
        const value = await roll(tags["user-id"], tags.username);

        if (value == null) {
          // function roll returns null if no rolls left
          await bot.say(
            channel,
            `@${tags.username} no rolls left maybe tomorrow natsu3DogeSmile `
          );
          return;
        }
        // roll results
        switch (value) {
          // boof pack
          case 420:
            await bot.say(
              channel,
              `@${tags.username} rolled a ${value}, mudDJ boof pack time mudDJ`
            );
            break;
          // haachama
          case 69:
            await bot.say(
              channel,
              `@${tags.username} rolled a ${value} natsuTired  can we roll again?  natsuPanic`
            );
            break;
          // only possible in the free rolls
          case 666:
            await bot.say(
              channel,
              `@${tags.username} rolled a ${value} you sure ur not possessed? natsuKnife`
            );
            break;
          // all other numbers
          default:
            await bot.say(
              channel,
              `natsuLaughing  natsuLaughing  @${tags.username} rolled a ${value} maybe tomorrow natsu3DogeSmile`
            );
            break;
        }
      } catch (err) {
        console.error("roll command failed:", err);
        await bot.say(
          channel,
          `@${tags.username} natsu codded something wrong... Wait that cant be it right? hes a SENIOR DEVELOPER? RIGHT??????`
        );
      }
    },
  },
  boin: {
    description: "Reminds nyaoki about boin",
    async execute(bot, channel, tags, args) {
      const target = args[0] || `@${tags.username}`; // If no input is given then tags the user who used it
      console.log(args);
      await bot.say(
        channel,
        `${target} was caught being a super cute BOIN! Awww..... So adorable! SoCute BOIN BOIN BOIN `
      );
    },
  },
  lyu: {
    description: "Shoutout lyu",
    async execute(bot, channel, tags, args) {
      await bot.say(
        channel,
        `Lyu? A big cutie! AMAZING ARTIST give them some support - precious and adorable -> https://twitter.com/Lyuriv and https://www.twitch.tv/lyuriv`
      );
    },
  },
  reset: {
    async execute(bot, channel, tags, args) {
      // Check if its the broadcaster using the command
      // call database and reset the "hasRolled to False"
      const broadcasterID = tags["room-id"];
      const isBroadcaster = tags["user-id"] === broadcasterID;
      if (!isBroadcaster) {
        return await bot.say(channel, `@${tags.username} nice try nerd lol`);
      }
      await bot.say(channel, `rolls resetted`);
      resetFreeRoll();
    },
  },
  async execute(bot, channel, tags, args) {
    await bot.say(channel, `MrDestructoid 7`);
  },
  // This command gives bits (DB ONLY) to be used as credits
  // only broadcaster can use this command otherwise answers "nice try nerd lol"
  // if no viewer is given then returns with a message
  // if no value is given assumes that is 1
  // if user is not in DB returns a joke
  // if user is in DB adds the bits
  giveroll: {
    description: "Gives rolls to a viewer",

    async execute(bot, channel, tags, args) {
      const broadcasterID = tags["room-id"];
      const isBroadcaster = tags["user-id"] === broadcasterID;

      // Checks if broadcaster using the command
      if (!isBroadcaster) {
        return await bot.say(channel, `@${tags.username} nice try nerd lol`);
      }
      // Input example ->  args = ["@natsubun", "30"]
      // if no target is given return
      const rawTarget = args[0];

      if (!rawTarget) {
        return await bot.say(
          channel,
          `natsu r u DUMB, who do you want to give a roll? usage: !giveroll @user [amount], YOU CODDED THIS`
        );
      }

      let target = rawTarget.trim();
      if (target.startsWith("@")) target = target.slice(1); // removes the @ from @<viewer>
      target = target.toLowerCase();

      const rollsGiven = Math.max(1, Math.floor(Number(args[1]) || 1));

      // Checks if viewer is in DB and updates bits accordingly
      try {
        const isUserInDB = await giveRoll(target, rollsGiven);
        if (!isUserInDB) {
          return await bot.say(
            channel,
            `@${tags.username} bro isnt even in the database and you want to give them more rolls? tell them to at least roll once `
          );
        }

        await bot.say(
          channel,
          `@${target} received ${rollsGiven} roll(s) not that it matters cause they suck at rolling anyway natsuHehehehehe `
        );
      } catch (err) {
        console.error("giveRoll (command) failed:", err);
        await bot.say(
          channel,
          `@${tags.username} something broke while giving rolls... classic natsu codding`
        );
      }
    },
  },
  "8ball": {
    description: "Returns a set of answers",
    async execute(bot, channel, tags, args) {
      return await bot.say(channel, ballResponse());
    },
  },
  rolls: {
    description: "Checks amount of rolls left",
    async execute(bot, channel, tags, args) {
      // Check if user is in DB
      // If user not in DB -> adds to DB
      // returns amount of rolls
      try {
        const isUserInDB = await getViewerById(tags["user-id"]);
        if (!isUserInDB) {
          insertUser(tags["user-id"], tags.username, 0, 0, 0); // bits = 0, hasRolled = false, totalRolls = 0
          console.log(`${tags.username} added to the database`);
          return await bot.say(
            channel,
            `@${tags.username} you have a single roll, pathetic.`
          );
        }
        const isRolled = await hasRolled(tags["user-id"]); // {hasRolled: <bool>}
        let numberOfRolls = await avaiableRolls(tags["user-id"]); // {bits: <bits>}
        numberOfRolls = Math.floor(numberOfRolls?.bits / rollCost); // rolls = bits/rollCost

        // console.log(isRolled?.hasRolled) -> 0 or 1
        // If hasRolled === 0 -> rolls = bits/rollCost + 1
        if (isRolled?.hasRolled === 0) {
          // Havent rolled
          numberOfRolls = 1 + numberOfRolls;
          return bot.say(
            channel,
            `@${tags.username} you have ${numberOfRolls} roll(s) left`
          );
        }
        if (numberOfRolls < 1) {
          return bot.say(
            channel,
            `@${tags.username} you have no rolls do you want more? Just cheer 100 bits ez lmao(JOKE DONT SPEND)`
          );
        }
        // If no bits or hasrolled === 1 -> return numberOfRolls
        return bot.say(
          channel,
          `@${tags.username} you have ${numberOfRolls} roll(s) left`
        );
      } catch (err) {
        console.error("giveRoll (command) failed:", err);
        await bot.say(channel, `natsu broke something, classic `);
      }
    },
  },
};

// ADD !ROLLS

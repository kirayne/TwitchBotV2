const path = require("path");
const { Database } = require("sqlite-async");

const dbPromise = Database.open(path.resolve(__dirname, "data.db"));
const rollRange = 1000;
const rollCost = 100;

// id - twitch id
// username - twitch user
// totalRolls - amount of times the command !roll was used with success
// bits - works like "credits" you can spend credits to use commands
// hasRolled - if viewer used free roll
async function init() {
  const db = await dbPromise;
  await db.run(`
    CREATE TABLE IF NOT EXISTS viewers(
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      totalRolls INTEGER DEFAULT 0,
      bits INTEGER DEFAULT 0,
      hasRolled INTEGER DEFAULT 0
    )
  `);

  await db.run(`CREATE TABLE IF NOT EXISTS viewerChat(
  id       INTEGER PRIMARY KEY,
  user_id  TEXT NOT NULL,
  username TEXT NOT NULL,
  message  TEXT NOT NULL,
  ts       INTEGER NOT NULL
);
`);

  await db.run(`
    DELETE FROM viewers WHERE id = 786607104;
`);
}

// receives the ID and returns the viewer row
async function getViewerById(id) {
  const db = await dbPromise;
  return db.get(`SELECT * FROM viewers WHERE id = ?`, [id]);
}

// receives the username and returns the viewer row
async function getViewerByUsername(username) {
  const db = await dbPromise;
  return db.get(
    `SELECT * FROM viewers WHERE LOWER(username) = LOWER(?) LIMIT 1`,
    [username]
  );
}
// receives the ID and returns 0 or 1
async function hasRolled(id) {
  const db = await dbPromise;
  try {
    return db.get(`SELECT hasRolled FROM viewers WHERE id = ?`, [id]);
  } catch (err) {
    console.log(err, "user not in DB");
  }
}
// Returns the number of rolls avaiable
async function avaiableRolls(id) {
  const db = await dbPromise;
  try {
    return db.get(`SELECT bits FROM viewers WHERE id = ?`, [id]);
  } catch (err) {}
}
// triggered when someone cheers, rolls,
async function insertViewer(id, username, bits, hasRolled, totalRolls) {
  const db = await dbPromise;
  await db.run(
    `INSERT INTO viewers (id, username, totalRolls, bits, hasRolled)
    VALUES (?, ?, ?, ?, ?)`,
    [id, username, totalRolls, bits, hasRolled]
  );
  return db.get(`SELECT * FROM viewers WHERE id = ?`, [id]);
}

// triggered when someone cheers
async function addBits(id, username, bitsToAdd) {
  const db = await dbPromise;
  const row = await getViewerById(id);

  if (!row) {
    return insertViewer(id, username, bitsToAdd, 0, 0);
  }

  await db.run(
    `INSERT INTO viewers (id, username, bits)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       bits = viewers.bits + excluded.bits`,
    [id, username, bitsToAdd]
  );
}

async function roll(id, username) {
  const db = await dbPromise;
  const row = await getViewerById(id);

  if (!row) {
    await insertViewer(id, username, 0, 1, 0);
    console.log("User:", username, "added to the database");
    return randomRoll(id, rollRange);
  }

  if (row.hasRolled === 0) {
    await db.run(
      `UPDATE viewers
         SET hasRolled = 1
       WHERE id = ?`,
      [id]
    );
    return randomRoll(id, rollRange);
  }

  if ((row.bits ?? 0) >= rollCost) {
    await db.run(
      `UPDATE viewers
         SET bits = bits - ?
       WHERE id = ?`,
      [rollCost, id]
    );
    return randomRoll(id, rollRange / 2);
  }

  return null;
}

// receives the username checks if they are in DB
// if they are not return false

async function giveRoll(targetUsername, rollsGiven) {
  const row = await getViewerByUsername(targetUsername);
  if (!row) return false;

  const db = await dbPromise;
  const bonusBits = rollsGiven * rollCost;

  await db.run(
    `UPDATE viewers
       SET bits = bits + ?
     WHERE username = ?`,
    [bonusBits, targetUsername]
  );
  return true;
}

// Rolls dice and adds to totalRolls
async function randomRoll(id, range) {
  const db = await dbPromise;
  await db.run(
    `UPDATE viewers
     SET totalRolls = totalRolls + 1
     WHERE id = ?`,
    [id]
  );
  return Math.floor(Math.random() * range) + 1;
}

// In the future make this automatic
// Sets hasRolled to false
async function resetFreeRoll() {
  const db = await dbPromise;
  await db.run(
    `UPDATE viewers
    set hasRolled = 0`
  );
}

// Markov stuff

// Logs chat messages
async function logViewerChat(userid, username, message) {
  const db = await dbPromise;
  return await db.run(
    `INSERT INTO viewerChat(user_id, username, message, ts)values (?, ?, ?, ?)`,
    [userid, username, message, Date.now()]
  );
}

module.exports = {
  init,
  resetFreeRoll,
  getViewerById,
  insertViewer,
  addBits,
  roll,
  giveRoll,
  getViewerByUsername,
  hasRolled,
  rollCost,
  avaiableRolls,
  logViewerChat,
};

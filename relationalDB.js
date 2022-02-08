const { Pool } = require("pg");
const crypto = require("crypto");
const R = require("ramda");
const Maybe = require("folktale/maybe");

const pgOptions = {
  host: process.env.PG_ENDPOINT,
  port: process.env.PG_PORT,
  database: process.env.PG_SQL_DATABASE,
  user: process.env.PG_SQL_USER,
  password: process.env.PG_SQL_PASSWORD,
  max: 5,
  idleTimeoutMillis: 5000,
  ssl: false,
  connectionTimeoutMillis: 10000,
};

const pgPool = new Pool(pgOptions);
//yorktodo新增ping
// pgPool.connect((err, client, release) => {
//   if (err) {
//     throw new Error("connect db fail", err.message);
//   }
//   client.query("SELECT NOW()", (err, result) => {
//     release();
//     if (err) {
//       throw new Error("connect db fail", err.message);
//     }
//     console.log(result.rows);
//   });
// });
pgPool.on("error", function (err) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.error(`postgresSQL error: ${err}`);
});

const platformEnum = {
  line: 1,
  discord: 2,
  telegram: 3,
};

// Side effect
function query(sqlAndParams = ["", []]) {
  return pgPool.query(...sqlAndParams);
}
async function execWithTransaction(execFunc) {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await execFunc(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Pure function
function insertAccountIfProfileNotExist(oauthID, platform) {
  return [
    `INSERT INTO account (id,platform) SELECT uuid_generate_v4(),$1 WHERE NOT EXISTS (SELECT 1 FROM ${platform}_profile WHERE userId = $2) RETURNING id`,
    [platformEnum[platform], oauthID],
  ];
}

function insertDiscordProfile(
  userId,
  username,
  locale,
  email,
  verified,
  accountID
) {
  return [
    "INSERT INTO discord_profile (userid,username,locale,email,verified,account_id) SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (SELECT 1 FROM discord_profile WHERE userid = $7)",
    [userId, username, locale, email, verified, accountID, userId],
  ];
}

function insertTelegramProfile(
  userID,
  firstName,
  lastName,
  username,
  accountID
) {
  return [
    "INSERT INTO telegram_profile (userid,first_name,last_name,username,account_id) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM discord_profile WHERE userid = $6)",
    [userID, firstName, lastName, username, accountID, userID],
  ];
}

function insertProfile(userId, displayName, pictureUrl, liffId, accountID) {
  return [
    "INSERT INTO line_profile (id,userId,displayName,pictureUrl,liffId,account_id) SELECT uuid_generate_v4(),$1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM line_profile WHERE userId = $6)",
    [userId, displayName, pictureUrl, liffId, accountID, userId],
  ];
}

function getAccountIdByOauthID(userID, platform) {
  return [
    `SELECT account_id FROM ${platform}_profile WHERE userId = $1`,
    [userID],
  ];
}

function selectAccountByLineUserID(lineUserID) {
  return ["SELECT * FROM line_profile WHERE userid=$1", lineUserID];
}

function selectAccountByEmailAndHashPassword(
  params = { email: "", password: "" }
) {
  const getEmail = R.pipe(R.path(["email"]));
  const getPasswordAndHash = R.pipe(R.path(["password"]), (password) =>
    crypto.createHash("sha256").update(password).digest("hex")
  );
  return R.pipe(
    R.converge(
      (email, hashPassword) => [
        `SELECT * FROM account WHERE email=$1 AND password=$2`,
        [email, hashPassword],
      ],
      [getEmail, getPasswordAndHash]
    )
  )(params);
}

function getRows(params = { rows: {} }) {
  return R.pipe(
    R.path(["rows"]),
    R.curry((rows) => (rows.length === 0 ? Maybe.Nothing() : Maybe.Just(rows)))
  )(params);
}

module.exports = {
  // Side effect
  query,
  execWithTransaction,
  // Pure function
  selectAccountByLineUserID,
  getAccountIdByOauthID,
  insertAccountIfProfileNotExist,
  selectAccountByEmailAndHashPassword,
  getRows,
  insertDiscordProfile,
  insertProfile,
  insertTelegramProfile,
};

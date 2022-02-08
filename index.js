require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const relationalDB = require("./relationalDB");
const { check } = require("express-validator");
const middleware = require("./middleware");
const { scopes, contentWithScopeAndAccountID } = require("./permission");
const jwt = require("./jwt");
const { verifyCode, verifyLIFF, gerProfile } = require("./line.js");
const { verifyDiscordCode, gerDiscordProfile } = require("./discord.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const R = require("ramda");

const PORT = process.env.PORT || 1000;
const secret = crypto
  .createHash("sha256")
  .update(process.env.TELEGRAM_BOT_TOKEN)
  .digest();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post(
  "/login",
  [check("email").exists(), check("password").exists()],
  middleware.checkRequestArgument,
  (req, res) => {
    R.pipe(
      relationalDB.selectAccountByEmailAndHashPassword,
      // Side effect
      relationalDB.query,
      R.andThen(
        R.pipe(
          relationalDB.getRows,
          (maybe) =>
            maybe.matchWith({
              Just: (justToken) =>
                R.pipe(
                  R.path([[0], "email"]),
                  // Side effect
                  jwt.sign,
                  R.andThen((token) => ({
                    status: 200,
                    content: { token },
                  }))
                )(justToken.value),
              Nothing: () =>
                Promise.resolve({
                  status: 403,
                  content: { error: "Email or password error" },
                }),
            }),
          // Side effect
          R.andThen((response) =>
            res.status(response.status).json(response.content)
          )
        )
      )
    )({
      email: req.body.email,
      password: req.body.password,
    });
  }
);

app.post("/verifyLIFF", async (req, res) => {
  const verifyLIFFResponse = await verifyLIFF(req.body.accessToken);
  if (!verifyLIFFResponse) {
    res.status(403).json({
      error: "forbidden",
    });
    return;
  }
  const lineProfile = await gerProfile(req.body.accessToken);
  if (!lineProfile.userId) {
    res.status(403).json({
      error: "forbidden",
    });
    return;
  }

  const accountID = await insertOrGetAccount(
    lineProfile.userId,
    "line",
    (accountID) =>
      relationalDB.insertProfile(
        lineProfile.userId,
        lineProfile.displayName,
        lineProfile.pictureUrl,
        req.body.liffid,
        accountID
      )
  );
  if (!accountID) {
    res.status(500).json({
      error: "internal error",
    });
    return;
  }

  const token = await jwt.sign(
    contentWithScopeAndAccountID({}, accountID, [scopes.messfarUser])
  );

  res.json({
    token: token,
  });
});

app.post("/verifyDiscordCode", async (req, res) => {
  try {
    const verifyDiscordCodeResponse = await verifyDiscordCode(
      req.body.code,
      req.body.redirectURI
    );
    const discordProfile = await gerDiscordProfile(
      verifyDiscordCodeResponse.access_token
    );
    if (!discordProfile.id) {
      res.status(403).json({
        error: "forbidden",
      });
      return;
    }

    const accountID = await insertOrGetAccount(
      discordProfile.id,
      "discord",
      (accountID) =>
        relationalDB.insertDiscordProfile(
          discordProfile.id,
          discordProfile.username,
          discordProfile.locale,
          discordProfile.email,
          discordProfile.verified,
          accountID,
          discordProfile.id
        )
    );
    if (!accountID) {
      throw new Error("account is empty");
    }

    const token = await jwt.sign(
      contentWithScopeAndAccountID({}, accountID, [scopes.messfarUser])
    );

    res.json({
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "internal error",
    });
  }
});

const telegramCodeToObject = (code) => {
  let buff = Buffer.from(code, "base64");
  let text = buff.toString("ascii");
  return JSON.parse(text);
};

// from https://gist.github.com/Pitasi/574cb19348141d7bf8de83a0555fd2dc
function checkSignature({ hash, ...data }) {
  const checkString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");
  return hmac === hash;
}

const verifyTelegramCode = (codeObject) => {
  return checkSignature(codeObject);
};

app.post("/verifyTelegramCode", async (req, res) => {
  const codeObject = telegramCodeToObject(req.body.code);
  if (!verifyTelegramCode(codeObject)) {
    res.status(403).json({
      error: "forbidden",
    });
    return;
  }

  const accountID = await insertOrGetAccount(
    codeObject.id,
    "telegram",
    (accountID) =>
      relationalDB.insertTelegramProfile(
        codeObject.id,
        codeObject.first_name,
        codeObject.last_name,
        codeObject.username,
        accountID
      )
  );

  if (!accountID) {
    res.status(500).json({
      error: "internal error",
    });
    return;
  }

  const token = await jwt.sign(
    contentWithScopeAndAccountID({}, accountID, [scopes.messfarUser])
  );
  res.json({
    token: token,
  });
});

app.post("/verifyLineCode", async (req, res) => {
  const verifyCodeResponse = await verifyCode(
    req.body.code,
    req.body.redirectURI
  );
  const lineProfile = await gerProfile(verifyCodeResponse.access_token);
  if (!lineProfile.userId) {
    res.status(403).json({
      error: "forbidden",
    });
    return;
  }

  const accountID = await insertOrGetAccount(
    lineProfile.userId,
    "line",
    (accountID) =>
      relationalDB.insertProfile(
        lineProfile.userId,
        lineProfile.displayName,
        lineProfile.pictureUrl,
        req.body.liffid,
        accountID
      )
  );

  if (!accountID) {
    res.status(500).json({
      error: "internal error",
    });
    return;
  }

  const token = await jwt.sign(
    contentWithScopeAndAccountID({}, accountID, [scopes.messfarUser])
  );
  res.json({
    token: token,
  });
});

app.post(
  "/verifyAuthToken",
  [check("token").exists()],
  middleware.checkRequestArgument,
  async (req, res) => {
    try {
      const decodedToken = await jwt.verify(req.body.token);
      res.json(decodedToken);
    } catch (err) {
      res.status(403).json({
        error: "forbidden",
      });
    }
  }
);

app.listen(PORT, function () {
  console.log(`App listening on port ${PORT}`);
});

//usecase

const insertOrGetAccount = (oauthID, platform, insertSQLWithAccountID) =>
  relationalDB.execWithTransaction(async (client) => {
    let accountID = "";

    // 查詢帳號是否存在
    const insertAccountRows = await client.query(
      ...relationalDB.insertAccountIfProfileNotExist(oauthID, platform)
    );

    // 如果不存在則新增帳號
    if (insertAccountRows.rowCount !== 0) {
      accountID = insertAccountRows.rows[0].id;
      await client.query(...insertSQLWithAccountID(accountID));
    }
    // 如果存在則查詢帳號
    else {
      const accountIDRows = await client.query(
        ...relationalDB.getAccountIdByOauthID(oauthID, platform)
      );
      if (accountIDRows.rows[0].account_id === 0) {
        throw new Error("account not found");
      }
      accountID = accountIDRows.rows[0].account_id;
    }

    return accountID;
  });

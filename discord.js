const request = require("request");

async function verifyDiscordCode(code, redirectURI) {
  let options = {
    method: "POST",
    url: "https://discord.com/api/oauth2/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    form: {
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectURI,
      scope: "identify email",
      code: code,
    },
  };
  return await new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) reject(new Error(error));
      resolve(JSON.parse(response.body));
    });
  });
}

async function gerDiscordProfile(accessToken) {
  let options = {
    method: "GET",
    url: "https://discord.com/api/users/@me",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  return await new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) reject(new Error(error));
      resolve(JSON.parse(response.body));
    });
  });
}

module.exports = {
  verifyDiscordCode,
  gerDiscordProfile,
};

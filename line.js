const request = require("request");

async function verifyLIFF(accessToken) {
  let options = {
    method: "GET",
    url: `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) reject(new Error(error));
      resolve(JSON.parse(response.body));
    });
  });
  if (response.client_id !== process.env.LINE_CLIENT_ID) {
    return new Error("wrong client id");
  }
  return response;
}

async function verifyCode(code, redirectURI) {
  let options = {
    method: "POST",
    url: "https://api.line.me/oauth2/v2.1/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    form: {
      grant_type: "authorization_code",
      code: code,
      client_id: process.env.LINE_CLIENT_ID,
      client_secret: process.env.LINE_CLIENT_SECRET,
      redirect_uri: redirectURI,
    },
  };
  return await new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) reject(new Error(error));
      resolve(JSON.parse(response.body));
    });
  });
}

async function gerProfile(accessToken) {
  let options = {
    method: "POST",
    url: "https://api.line.me/v2/profile",
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
  verifyLIFF,
  verifyCode,
  gerProfile,
};

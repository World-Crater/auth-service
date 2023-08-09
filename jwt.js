const jwt = require("jsonwebtoken");
const fs = require("fs");

const privateKey = fs.readFileSync("./cert/key.private.pem");
const publicKey = fs.readFileSync("./cert/key.public.pem");

function sign(content) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      content,
      privateKey,
      {
        algorithm: "RS256",
        expiresIn: 60 * 60 * 24,
      },
      function (err, token) {
        if (err) return reject(err);
        resolve(token);
      }
    );
  });
}

function verify(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      publicKey,
      { algorithms: ["RS256"] },
      function (err, decoded) {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

module.exports = {
  sign,
  verify,
};

require("dotenv").config();
const express = require("express");
const relationalDB = require("./relationalDB");
const { check } = require("express-validator");
const middleware = require("./middleware");
const { scopes, contentWithScope } = require("./permission");
const jwt = require("./jwt");
const { verifyCode } = require("./line.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const R = require("ramda");

const PORT = process.env.PORT || 1000;

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

app.post("/verifyLineCode", async (req, res) => {
  const verifyCodeResponse = await verifyCode(
    req.body.code,
    req.body.redirectURI
  );
  const token = await jwt.sign(
    contentWithScope(verifyCodeResponse, [scopes.messfarUser])
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
    const decodedToken = await jwt.verify(req.body.token);
    res.json(decodedToken);
  }
);

app.listen(PORT, function () {
  console.log(`App listening on port ${PORT}`);
});

const jwt = require("./jwt");

test("jwt", async () => {
  const token = await jwt.sign({ a: "b" });
  console.log("token: ", token);
  setTimeout(() => {
    jwt.verify(token);
  }, 1000 * 3);
});

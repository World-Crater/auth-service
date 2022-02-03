const scopes = {
  messfarAdmin: "messfarAdmin",
  messfarUser: "messfarUser",
};

const contentWithScope = (content, scopes) => ({
  scopes: scopes,
  content: content,
});

module.exports = {
  contentWithScope,
  scopes,
};

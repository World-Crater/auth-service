const scopes = {
  messfarAdmin: "messfarAdmin",
  messfarUser: "messfarUser",
};

const contentWithScopeAndAccountID = (content, accountID, scopes) => ({
  scopes: scopes,
  accountID: accountID,
  content: content,
});

module.exports = {
  contentWithScopeAndAccountID,
  scopes,
};

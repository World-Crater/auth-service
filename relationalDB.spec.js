const relationalDB = require('./relationalDB')
const Maybe = require('folktale/maybe')

test('selectAccountByEmailAndHashPassword', () => {
  expect(relationalDB.selectAccountByEmailAndHashPassword(
    {
      email: '123@gmail.com',
      password: 'abcd'
    }
  )).toStrictEqual(
    [
      "SELECT * FROM account WHERE email=$1 AND password=$2",
      [
        "123@gmail.com",
        "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589"
      ]
    ]
  )
})

test('getRows', () => {
  expect(relationalDB.getRows(
    {
      rows: '123'
    }
  )).toStrictEqual(
    Maybe.Just('123')
  )
})
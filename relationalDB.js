const { Pool } = require('pg')
const crypto = require('crypto')
const R = require('ramda')
const Maybe = require('folktale/maybe')

const pgOptions = {
  host: process.env.PG_ENDPOINT,
  port: process.env.PG_PORT,
  database: process.env.PG_SQL_DATABASE,
  user: process.env.PG_SQL_USER,
  password: process.env.PG_SQL_PASSWORD,
  max: 5,
  idleTimeoutMillis: 5000,
  ssl: false,
  connectionTimeoutMillis: 10000
}

const pgPool = new Pool(pgOptions)
pgPool.on('error', function (err) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.error(`postgresSQL error: ${err}`)
})

// Side effect
function query (sqlAndParams = ['', []]) {
  return pgPool.query(...sqlAndParams)
}

// Pure function
function selectAccountByEmailAndHashPassword (params = { email: '', password: '' }) {
  const getEmail = R.pipe(
    R.path(['email'])
  )
  const getPasswordAndHash = R.pipe(
    R.path(['password']),
    password => crypto.createHash('sha256').update(password).digest('hex')
  )
  return R.pipe(
    R.converge((email, hashPassword) => (
      [
        `SELECT * FROM account WHERE email=$1 AND password=$2`,
        [email, hashPassword]
      ]
    ), [getEmail, getPasswordAndHash])
  )(params)
}

function getRows (params = { rows: {} }) {
  return R.pipe(
    R.path(['rows']),
    R.curry(rows => rows.length === 0 ? Maybe.Nothing() : Maybe.Just(rows))
  )(params)
}

module.exports = {
  // Side effect
  query,
  // Pure function
  selectAccountByEmailAndHashPassword,
  getRows
}
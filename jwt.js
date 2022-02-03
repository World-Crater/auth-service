const jwt = require('jsonwebtoken')
const fs = require('fs')

const privateKey = fs.readFileSync('private.pem')
const publicKey = fs.readFileSync('public.pem')

function sign (content) {
  return new Promise((resolve, reject) => {
    jwt.sign(content, privateKey, { algorithm: 'RS256' }, function(err, token) {
      if (err) return reject(err)
      resolve(token)
    })
  })
}

function verify (token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, function(err, decoded) {
      if (err) return reject(err)
      resolve(decoded)
    })
  })
}

module.exports = {
  sign,
  verify
}
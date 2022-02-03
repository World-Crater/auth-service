const crypto = require('crypto')

console.log(crypto.createHash('sha256').update("sammy117").digest('hex'))
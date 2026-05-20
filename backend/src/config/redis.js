'use strict'

const Redis = require('ioredis')
const { env } = require('./env')

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck:     true,
  lazyConnect:          false,
})

redis.on('error',   (err) => console.error('[redis] error', err))
redis.on('connect', ()    => console.log('[redis] connected'))

module.exports = { redis }

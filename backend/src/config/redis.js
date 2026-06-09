'use strict'

const Redis = require('ioredis')
const { env } = require('./env')

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 0,           // fail immediately, don't retry commands
  enableOfflineQueue:   false,       // don't queue commands when Redis is down
  enableReadyCheck:     false,
  lazyConnect:          true,
  connectTimeout:       2000,
  retryStrategy: (times) => Math.min(times * 500, 10000),
})

redis.on('error',   (err) => console.error('[redis] error', err))
redis.on('connect', ()    => console.log('[redis] connected'))

module.exports = { redis }

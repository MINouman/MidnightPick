'use strict'

const Redis = require('ioredis')
const { env } = require('./env')

const isProduction = env.NODE_ENV === 'production'
let warnedUnavailable = false

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 0,           // fail immediately, don't retry commands
  enableOfflineQueue:   false,       // don't queue commands when Redis is down
  enableReadyCheck:     true,
  lazyConnect:          !isProduction,
  connectTimeout:       5000,
  retryStrategy: (times) => isProduction ? Math.min(times * 500, 10000) : null,
})

redis.on('error',   (err) => {
  if (isProduction) {
    console.error('[redis] error', err)
    return
  }
  if (!warnedUnavailable) {
    warnedUnavailable = true
    console.warn(`[redis] unavailable in development (${err.code || err.message}); using non-Redis fallbacks where supported.`)
  }
})
redis.on('connect', ()    => console.log('[redis] connected'))

module.exports = { redis }

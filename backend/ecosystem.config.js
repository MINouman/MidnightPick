'use strict'

module.exports = {
  apps: [
    {
      name: 'midnight-api',
      script: 'src/app.js',
      // Single 1 vCPU droplet: one fork-mode process. Cluster mode adds overhead
      // with no throughput gain on one core. Bump `instances` when you upgrade.
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 5000,       // 5s graceful shutdown
      // Restart the worker if it leaks past ~220 MB — well before it can starve
      // Postgres/Redis on a 1 GB box. Raise this when you move to a bigger plan.
      max_memory_restart: '220M',

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // All other env vars loaded from the system environment or .env
      },

      // Restart policy
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logs
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}

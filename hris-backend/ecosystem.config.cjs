module.exports = {
  apps: [
    {
      name: 'hris-backend',
      script: './src/server.js',
      cwd: '/root/hris-backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '250M',
      autorestart: true,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        ALLOWED_ORIGINS: 'https://hris.barokahgroupindonesia.tech'
      }
    }
  ]
};

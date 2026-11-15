module.exports = {
  apps: [
    {
      name: 'afresto-converter',
      script: './server.mjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '180M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

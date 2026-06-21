module.exports = {
  apps: [{
    name: 'sustainomics',
    script: './dist/server/entry.mjs',
    cwd: '/home/azureuser/sustainomics',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1',
    },
  }],
};

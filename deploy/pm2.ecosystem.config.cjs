/**
 * PM2 — تشغيل الموقع على السيرفر
 * من جذر المشروع:
 *   pnpm build
 *   pm2 start deploy/pm2.ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "weekendgate-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        // منافذ بديلة حتى لا تتعارض مع مشروع آخر على نفس السيرفر
        API_PORT: 3011,
      },
    },
    {
      name: "weekendgate-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3012",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3012,
      },
    },
    {
      name: "weekendgate-worker",
      cwd: "./apps/worker",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

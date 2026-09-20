/**
 * PM2 — تشغيل الموقع على السيرفر
 * من جذر المشروع:
 *   pnpm build
 *   pm2 start deploy/pm2.ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * WEB_INSTANCES / API_INSTANCES override process count (default 2).
 */
const apiInstances = Math.max(1, Number(process.env.API_INSTANCES || 2));
const webInstances = Math.max(1, Number(process.env.WEB_INSTANCES || 2));

module.exports = {
  apps: [
    {
      name: "weekendgate-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: apiInstances,
      exec_mode: apiInstances > 1 ? "cluster" : "fork",
      env: {
        NODE_ENV: "production",
        API_PORT: 3011,
        PRISMA_CONNECTION_LIMIT: process.env.PRISMA_CONNECTION_LIMIT || "5",
        SEARCH_MAX_INFLIGHT: process.env.SEARCH_MAX_INFLIGHT || "40",
      },
    },
    {
      name: "weekendgate-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3012",
      instances: webInstances,
      exec_mode: webInstances > 1 ? "cluster" : "fork",
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
        SEARCH_QUEUE_CONCURRENCY: process.env.SEARCH_QUEUE_CONCURRENCY || "8",
      },
    },
  ],
};

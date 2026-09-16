import path from "node:path";
import { config as loadEnv } from "dotenv";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { APP_NAME, QUEUE_NAMES } from "@watesly-travel/shared";
import { PrismaClient } from "@watesly-travel/database";
import { sendWhatsAppText } from "@watesly-travel/whatsapp-core";

loadEnv({ path: path.resolve(__dirname, "../../../.env") });

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6380";
const queuePrefix = process.env.QUEUE_PREFIX ?? "watesly_travel";
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

const prisma = new PrismaClient();

async function main() {
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const queueOptions = { connection, prefix: queuePrefix };

  const workers = [
    new Worker(
      QUEUE_NAMES.health,
      async (job) => ({
        ok: true,
        app: APP_NAME,
        jobId: job.id,
        processedAt: new Date().toISOString(),
      }),
      { ...queueOptions, concurrency },
    ),
    new Worker(
      QUEUE_NAMES.outboundWhatsapp,
      async (job) => {
        const data = job.data as {
          organizationId: string;
          phoneNumberId: string;
          accessToken: string;
          to: string;
          body: string;
          conversationId?: string;
        };

        const result = await sendWhatsAppText({
          phoneNumberId: data.phoneNumberId,
          accessToken: data.accessToken,
          to: data.to,
          body: data.body,
        });

        if (data.conversationId) {
          await prisma.message.create({
            data: {
              organizationId: data.organizationId,
              conversationId: data.conversationId,
              direction: "outbound",
              channel: "whatsapp",
              type: "text",
              body: data.body,
              providerMessageId: result.providerMessageId || null,
              status: result.status,
              rawPayload: result.raw as object | undefined,
            },
          });
        }

        return result;
      },
      { ...queueOptions, concurrency },
    ),
    new Worker(
      QUEUE_NAMES.campaignSend,
      async (job) => {
        const data = job.data as { campaignId: string; organizationId: string };
        const campaign = await prisma.campaign.findFirst({
          where: {
            id: data.campaignId,
            organizationId: data.organizationId,
          },
          include: {
            template: true,
            recipients: { include: { contact: true } },
          },
        });
        if (!campaign) return { skipped: true };

        const account = await prisma.whatsAppAccount.findFirst({
          where: { organizationId: data.organizationId },
        });

        let sent = 0;
        let failed = 0;

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "running" },
        });

        for (const recipient of campaign.recipients) {
          const body =
            campaign.template?.body ||
            "رسالة من وكالتكم عبر Watesly Travel AI";
          try {
            const result = await sendWhatsAppText({
              phoneNumberId: account?.phoneNumberId || "mock",
              accessToken: account?.accessTokenEnc || "mock",
              to: recipient.contact.waId,
              body,
            });
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: result.status === "failed" ? "failed" : "sent",
                sentAt: new Date(),
              },
            });
            if (result.status === "failed") failed += 1;
            else sent += 1;
          } catch {
            failed += 1;
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: { status: "failed", error: "worker send failed" },
            });
          }
        }

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "completed",
            stats: { sent, failed, pending: 0 },
          },
        });

        return { sent, failed };
      },
      { ...queueOptions, concurrency },
    ),
  ];

  for (const worker of workers) {
    worker.on("ready", () => {
      // eslint-disable-next-line no-console
      console.log(`[worker] ready — ${worker.name}`);
    });
    worker.on("failed", (job, error) => {
      // eslint-disable-next-line no-console
      console.error(`[worker] failed ${worker.name} id=${job?.id}`, error.message);
    });
  }

  const healthQueue = new Queue(QUEUE_NAMES.health, queueOptions);
  await healthQueue.add(
    "bootstrap-ping",
    { source: "worker-bootstrap" },
    { removeOnComplete: 100, removeOnFail: 100 },
  );

  // eslint-disable-next-line no-console
  console.log(`[worker] started for ${APP_NAME}`);
}

main().catch(async (error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[worker] failed to start", error);
  await prisma.$disconnect();
  process.exit(1);
});

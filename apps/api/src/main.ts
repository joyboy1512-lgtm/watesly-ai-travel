import "./load-env";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, type Request, type Response, type NextFunction } from "express";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const port = Number(process.env.API_PORT ?? 3001);

  const uploadsRoot =
    process.env.UPLOADS_DIR || join(process.cwd(), "..", "..", "uploads");
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: "/uploads/" });

  // Capture raw body for WhatsApp signature verification, then parse JSON.
  app.use(
    json({
      limit: "8mb",
      verify: (
        req: Request & { rawBody?: Buffer },
        _res: Response,
        buf: Buffer,
      ) => {
        if (
          req.originalUrl?.includes("/whatsapp/webhook") ||
          req.originalUrl?.includes("/shop/payments/webhook")
        ) {
          req.rawBody = Buffer.from(buf);
        }
      },
    }),
  );

  // Lightweight in-memory rate limit for public auth/webhook endpoints.
  const hits = new Map<string, { count: number; resetAt: number }>();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxHits = Number(process.env.RATE_LIMIT_MAX || 100);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path || "";
    if (
      !path.startsWith("/auth/") &&
      !path.startsWith("/whatsapp/webhook") &&
      !path.startsWith("/shop/unlock") &&
      !path.startsWith("/shop/login") &&
      !path.startsWith("/shop/airports") &&
      !path.startsWith("/shop/cities") &&
      !path.startsWith("/shop/payments/webhook")
    ) {
      return next();
    }
    const key = `${req.ip}:${path}`;
    const now = Date.now();
    const current = hits.get(key);
    if (!current || current.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > maxHits) {
      return res.status(429).json({ message: "طلبات كثيرة، حاول لاحقًا" });
    }
    return next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Controllers that still use plain body types should not be blocked.
      skipMissingProperties: false,
      validateCustomDecorators: true,
    }),
  );

  const corsOrigins = Array.from(
    new Set(
      [
        ...(process.env.CORS_ORIGINS ?? "http://localhost:3002").split(","),
        "http://localhost:3002",
        "http://127.0.0.1:3002",
      ]
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

void bootstrap();

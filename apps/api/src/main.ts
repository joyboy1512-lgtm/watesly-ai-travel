import "./load-env";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, type Request, type Response, type NextFunction } from "express";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import {
  assertProductionSecrets,
  clientIpFromRequest,
  isProductionRuntime,
} from "./common/security-env";
import { sharedIncr } from "./common/shared-kv";

async function bootstrap() {
  assertProductionSecrets();

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

  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxHitsDefault = Number(process.env.RATE_LIMIT_MAX || 100);
  const maxHitsAuth = Number(process.env.RATE_LIMIT_AUTH_MAX || 20);
  const maxHitsSearch = Number(process.env.RATE_LIMIT_SEARCH_MAX || 60);
  const maxHitsAssistant = Number(process.env.RATE_LIMIT_ASSISTANT_MAX || 30);

  // Trust a single reverse-proxy hop (Caddy) only when explicitly enabled.
  app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path || "";
    let maxHits = 0;
    if (
      path.startsWith("/auth/") ||
      path.startsWith("/shop/unlock") ||
      path.startsWith("/shop/login")
    ) {
      maxHits = maxHitsAuth;
    } else if (
      path.startsWith("/shop/flights") ||
      path.startsWith("/shop/hotels") ||
      path.startsWith("/shop/airports") ||
      path.startsWith("/shop/cities") ||
      path.startsWith("/shop/search")
    ) {
      maxHits = maxHitsSearch;
    } else if (
      path.startsWith("/shop/assistant") ||
      path.startsWith("/assistant")
    ) {
      maxHits = maxHitsAssistant;
    } else if (
      path.startsWith("/whatsapp/webhook") ||
      path.startsWith("/shop/payments/webhook")
    ) {
      maxHits = maxHitsDefault;
    } else {
      return next();
    }

    const ip = clientIpFromRequest(req);
    const bucket = `rl:${ip}:${path.split("/").slice(0, 3).join("/")}`;
    try {
      const count = await sharedIncr(bucket, windowMs);
      if (count > maxHits) {
        return res.status(429).json({ message: "طلبات كثيرة، حاول لاحقًا" });
      }
    } catch {
      // fail-open on shared store errors
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

  if (isProductionRuntime()) {
    // eslint-disable-next-line no-console
    console.log("[api] production security checks passed");
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

void bootstrap();

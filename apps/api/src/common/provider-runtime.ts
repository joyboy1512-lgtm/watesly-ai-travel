import {
  getFlightProvider,
  getHotelProvider,
  getTransferProvider,
  resolveFlightProviderKey,
  resolveHotelProviderKey,
  resolveTransferProviderKey,
  type FlightProviderAdapter,
  type HotelProviderAdapter,
  type TransferProviderAdapter,
} from "@watesly-travel/provider-sdk";
import type { PrismaService } from "../prisma/prisma.service";
import { decryptProviderConfig } from "./secrets";

export async function getFlightProviderForOrg(
  prisma: PrismaService,
  organizationId: string,
  preferred?: string,
): Promise<FlightProviderAdapter> {
  const key = resolveFlightProviderKey(preferred);
  const row = await prisma.travelProviderConfig.findUnique({
    where: {
      organizationId_providerKey: { organizationId, providerKey: key },
    },
    select: { configEncrypted: true, enabled: true },
  });
  const creds =
    row?.enabled && row.configEncrypted
      ? decryptProviderConfig<Record<string, string>>(row.configEncrypted) ||
        undefined
      : undefined;
  return getFlightProvider(key, {
    accessToken: creds?.accessToken,
    clientId: creds?.clientId,
    clientSecret: creds?.clientSecret,
    hostname: creds?.hostname,
    username: creds?.username,
    password: creds?.password,
    targetBranch: creds?.targetBranch,
    endpoint: creds?.endpoint,
    loginId: creds?.loginId,
  });
}

export async function getHotelProviderForOrg(
  prisma: PrismaService,
  organizationId: string,
  preferred?: string,
): Promise<HotelProviderAdapter> {
  const key = resolveHotelProviderKey(preferred);
  const row = await prisma.travelProviderConfig.findUnique({
    where: {
      organizationId_providerKey: { organizationId, providerKey: key },
    },
    select: { configEncrypted: true, enabled: true },
  });
  const creds =
    row?.enabled && row.configEncrypted
      ? decryptProviderConfig<Record<string, string>>(row.configEncrypted) ||
        undefined
      : undefined;
  return getHotelProvider(key, creds);
}

export async function getTransferProviderForOrg(
  prisma: PrismaService,
  organizationId: string,
  preferred?: string,
): Promise<TransferProviderAdapter> {
  const key = resolveTransferProviderKey(preferred);
  const row = await prisma.travelProviderConfig.findUnique({
    where: {
      organizationId_providerKey: { organizationId, providerKey: key },
    },
    select: { configEncrypted: true, enabled: true },
  });
  const creds =
    row?.enabled && row.configEncrypted
      ? decryptProviderConfig<Record<string, string>>(row.configEncrypted) ||
        undefined
      : undefined;
  return getTransferProvider(key, {
    apiKey: creds?.transferApiKey,
    apiSecret: creds?.transferApiSecret,
    baseUrl: creds?.transferBaseUrl || creds?.baseUrl,
  });
}

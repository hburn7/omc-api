import * as osu from "osu-api-v2-js";
import dotenv from "dotenv";
import { logger } from "./logger.ts";

dotenv.config();

const resolveCredentials = () => {
  const rawClientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!rawClientId) {
    throw new Error("OSU_CLIENT_ID not configured");
  }
  if (!clientSecret) {
    throw new Error("OSU_CLIENT_SECRET not configured");
  }

  const clientId = Number.parseInt(rawClientId, 10);

  if (Number.isNaN(clientId)) {
    throw new Error("OSU_CLIENT_ID must be a valid number");
  }

  return { clientId, clientSecret };
};

class OsuApi {
  private static instance: osu.API | null = null;
  private static initPromise: Promise<osu.API> | null = null;

  private static async initialize(): Promise<osu.API> {
    if (this.instance) {
      return this.instance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const { clientId, clientSecret } = resolveCredentials();

      logger.debug("Creating osu! API client", { clientId });
      this.instance = await osu.API.createAsync(clientId, clientSecret);
      logger.info("osu! API client ready");
      return this.instance;
    })();

    return this.initPromise;
  }

  static getInstance(): Promise<osu.API> {
    return this.initialize();
  }
}

export const getApi = (): Promise<osu.API> => OsuApi.getInstance();

export const api: osu.API = await OsuApi.getInstance();

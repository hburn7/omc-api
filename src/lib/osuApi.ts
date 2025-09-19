import * as osu from "osu-api-v2-js";

import dotenv from "dotenv";
import { logger } from "./logger.ts";

dotenv.config();

class ApiWrapper {
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
      const clientId = Number(process.env.OSU_CLIENT_ID);
      const clientSecret = process.env.OSU_CLIENT_SECRET;

      if (!clientSecret) {
        const message = "OSU_CLIENT_SECRET not configured";
        logger.error(message);
        throw new Error(message);
      }

      logger.debug("Creating osu! API client", { clientId });
      this.instance = await osu.API.createAsync(clientId, clientSecret);
      logger.info("osu! API client ready");
      return this.instance;
    })();

    return this.initPromise;
  }

  static async getApi(): Promise<osu.API> {
    return this.initialize();
  }
}

export const api = await ApiWrapper.getApi();

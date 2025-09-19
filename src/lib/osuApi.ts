import * as osu from "osu-api-v2-js";
import dotenv from "dotenv";

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

const createApiInstance = async (): Promise<osu.API> => {
  const { clientId, clientSecret } = resolveCredentials();
  return osu.API.createAsync(clientId, clientSecret);
};

class OsuApi {
  private static instance: Promise<osu.API> | null = null;

  static getInstance(): Promise<osu.API> {
    if (!OsuApi.instance) {
      OsuApi.instance = createApiInstance();
    }

    return OsuApi.instance;
  }
}

export const getApi = (): Promise<osu.API> => OsuApi.getInstance();

export const api: osu.API = await OsuApi.getInstance();

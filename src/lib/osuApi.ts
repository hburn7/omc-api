import * as osu from "osu-api-v2-js";
import dotenv from "dotenv";

dotenv.config();

declare global {
  // eslint-disable-next-line no-var
  var __omc_osu_api_instance: Promise<osu.API> | undefined;
}

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

const apiPromise: Promise<osu.API> = globalThis.__omc_osu_api_instance ?? (
  globalThis.__omc_osu_api_instance = createApiInstance()
);

export const getApi = (): Promise<osu.API> => apiPromise;

export const api: osu.API = await apiPromise;

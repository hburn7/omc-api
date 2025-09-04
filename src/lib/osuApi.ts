import * as osu from "osu-api-v2-js"

import dotenv from 'dotenv'
dotenv.config()

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
                throw new Error("OSU_CLIENT_SECRET not configured");
            }

            this.instance = await osu.API.createAsync(clientId, clientSecret);
            return this.instance;
        })();

        return this.initPromise;
    }

    static async getApi(): Promise<osu.API> {
        return this.initialize();
    }
}

export const api = await ApiWrapper.getApi();

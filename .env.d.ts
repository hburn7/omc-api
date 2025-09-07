declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OSU_CLIENT_ID: string;
      OSU_CLIENT_SECRET: string;
      API_KEY_SECRET: string;
    }
  }
}

export {};
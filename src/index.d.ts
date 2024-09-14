declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      SUBNET?: string;
      TOKENS?: string;
    }
  }
}

export {};

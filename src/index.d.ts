declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      SUBNET?: string;
      USER?: string;
      PASS?: string;
    }
  }
}

export {};

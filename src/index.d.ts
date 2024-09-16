declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      SUBNET?: string;
      URL_PROXY?: string;
      AGENT_PROXY?: string;
      TOKENS?: string;
    }
  }
}

export {};

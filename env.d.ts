declare module "bun" {
  interface Env {
    SRT_URL: string;
    RTMP_URL: string;
    PORT: number | undefined;
  }
}

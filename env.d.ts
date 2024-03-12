declare module "bun" {
  interface Env {
    SRT_URL: string;
    RTMP_URL: string;
    PORT: number | undefined;
    GST: string;
    GST_ENCODER_PATH: string;
    FFMPEG: string;
    FFMPEG_ENCODER_PATH: string;
  }
}

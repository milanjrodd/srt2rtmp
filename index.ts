import { EncoderService } from "./encoder.service";

const encoderService = new EncoderService();

// TODO: Check if server was restarted and re-create unfinished encoders from database

Bun.serve({
  async fetch(req) {
    if (req.url === "/") {
      return new Response("Hello, from srt2rtmp encoder!");
    }

    if (req.url === "/srt2rtmp" && req.method === "POST") {
      // TODO: Add internal secret for authentication

      try {
        const body = await req.json();
        const { srtUrl, rtmpUrl } = body as {
          srtUrl: string | undefined;
          rtmpUrl: string | undefined;
        };

        if (!srtUrl || !rtmpUrl) {
          return new Response("SRT URL and RTMP URL are required", {
            status: 400,
          });
        }

        const encoder = await encoderService.createEncoder(srtUrl, rtmpUrl);
      } catch (error) {
        return new Response("Invalid request body", { status: 400 });
      }

      return new Response("Encoder started", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
  port: import.meta.env.PORT ?? 3000,
});

console.log(`srt2rtmp server running on port ${import.meta.env.PORT ?? 3000}`);

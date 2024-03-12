import { EncoderService } from "./encoder.service";

const encoderService = new EncoderService();

// TODO: Check if server was restarted and re-create unfinished encoders from database

Bun.serve({
  async fetch(req, s) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response("Hello, from srt2rtmp encoder!");
    }

    if (url.pathname === "/srt2rtmp" && req.method === "POST") {
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

        const encoder = await encoderService.createGSTEncoder(srtUrl, rtmpUrl);
      } catch (error) {
        return new Response(error as string, { status: 400 });
      }

      return new Response("Encoder started", { status: 200 });
    }

    if (url.pathname === "/srt2rtmp:ffmpeg" && req.method === "POST") {
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

        const encoder = await encoderService.createFFMPEGEncoder(srtUrl, rtmpUrl);
      } catch (error) {
        return new Response(error as string, { status: 400 });
      }

      return new Response("Encoder started", { status: 200 });
    }

    return new Response("Method Not found", { status: 404 });
  },
  port: import.meta.env.PORT ?? 3000,
});

console.log(`srt2rtmp server running on port ${import.meta.env.PORT ?? 3000}`);

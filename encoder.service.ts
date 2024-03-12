import { env, $, ShellPromise, type Subprocess, resolve, pathToFileURL } from "bun";
// import { srt2rtmpPipeline } from "./encoder";

const ENCODING_PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
] as const;

type EncodingPreset = (typeof ENCODING_PRESETS)[number];

interface IEncoderOptions {
  audioSamplingRate: number;
  videoBitrate: number;
  reconnectDelayInSeconds: number;
  inputBufferSizeInKB: number;
  bufferSize?: number;
  frameRate: number;
  preset: EncodingPreset;
  bframes: number;
}

async function SendSrtToRtmp(
  srtUrl: string,
  rtmpUrl: string,
  autoInstall = true,
  encoderOptions: IEncoderOptions = {
    audioSamplingRate: 44100,
    videoBitrate: 8000,
    inputBufferSizeInKB: 1024,
    reconnectDelayInSeconds: 2,
    frameRate: 48,
    preset: "superfast",
    bframes: 2,
  }
) {
  if (!srtUrl) throw new Error("SRT URL is required");
  if (!rtmpUrl) throw new Error("RTMP URL is required");

  const srtParams = {
    recv_buffer_size: encoderOptions.inputBufferSizeInKB * 1024,
    snddropdelay: encoderOptions.reconnectDelayInSeconds * 1000 * 1000,
  };

  const srtUrlWithParams = new URL(srtUrl);
  for (const [key, value] of Object.entries(srtParams)) {
    srtUrlWithParams.searchParams.append(key, value.toString());
  }

  srtUrlWithParams.search = decodeURIComponent(srtUrlWithParams.search);

  const args = {
    uri: srtUrlWithParams.toString(),
    ar: encoderOptions.audioSamplingRate,
    cv: "libx264",
    x264opts: `nal-hrd=cbr:bframes=${encoderOptions.bframes}:keyint=${
      2 * encoderOptions.frameRate
    }:no-scenecut`,
    preset: encoderOptions.preset,
    ca: "aac",
    ba: "160000",
    bv: `${encoderOptions.videoBitrate}k`,
    bufsize: `${encoderOptions.bufferSize ?? encoderOptions.videoBitrate * 2}k`,
    filterv: `fps=${encoderOptions.frameRate}`,
    f: "flv",
  };

  const converter = await $`gst-launch-1.0 srtsrc uri=${srtUrl} blocksize=${
    1024 * 1024
  } mode="caller" auto-reconnect=false \
    ! queue ! decodebin name=src \
    \
    src. ! queue ! x264enc cabac=1 bframes=2 ref=1 bitrate=3000 ! "video/x-h264,profile=main" ! mux. \
    \
    src. ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000,channels=2 ! faac bitrate=128000 \
    \
    ! queue ! flvmux name=mux streamable=true ! queue ! rtmpsink location=${rtmpUrl}`;

  if (converter.stderr !== null) {
    const error = converter.stderr.toString();

    if (error.includes("command not found: ffmpeg")) {
      if (!autoInstall) {
        throw new Error("ffmpeg is not installed");
      }

      console.log("Installing ffmpeg...");

      switch (env.OS) {
        case "darwin":
          // macOS
          await $`brew install ffmpeg`;
          break;
        case "linux":
          // Linux
          await $`sudo apt-get install ffmpeg`;
          break;
        case "windows":
          // Windows
          await $`choco install ffmpeg`;
          break;
      }

      return SendSrtToRtmp(srtUrl, rtmpUrl, false);
    }
  }

  for (const line of converter.stdout.toString()) {
    console.log(line);
  }
}

const gst = import.meta.env.GST;
const ffmpeg = import.meta.env.FFMPEG;

export class EncoderService {
  // IDEA: save encoders in a database, so that they can be retrieved later even if the server restarts

  private encoders: Map<string, Subprocess> = new Map();

  constructor() {}

  public async createGSTEncoder(srtUrl: string, rtmpUrl: string) {
    if (!srtUrl) throw new Error("SRT URL is required");
    if (!rtmpUrl) throw new Error("RTMP URL is required");

    const encoders = this.encoders;
    
    const encoderPath = import.meta.env.GST_ENCODER_PATH;

    const encoder = Bun.spawn([encoderPath], {
      cwd: ".",
      env: { RTMP_URL: rtmpUrl, SRT_URL: srtUrl, GST: gst },
      onExit(proc, exitCode, signalCode, error) {
        if (error) {
          console.error(error);
        } else {
          console.log(`Encoder exited with code ${exitCode}`);
        }

        encoders.delete(srtUrl);
      },
    });

    const textDecoder = new TextDecoder();

    new Promise(async (resolve, reject) => {
      for await (let line of encoder.stdout.values()) {
        console.log("[ ENCODER", encoder.pid, "]:", textDecoder.decode(line)); 
      }
    });
    
    

    encoders.set(srtUrl, encoder);

    return encoder;
  }

  public async createFFMPEGEncoder(srtUrl: string, rtmpUrl: string) {
    if (!srtUrl) throw new Error("SRT URL is required");
    if (!rtmpUrl) throw new Error("RTMP URL is required");

    const encoders = this.encoders;
    
    const encoderPath = import.meta.env.FFMPEG_ENCODER_PATH;

    const encoder = Bun.spawn([encoderPath], {
      cwd: ".",
      env: { RTMP_URL: rtmpUrl, SRT_URL: srtUrl, FFMPEG: ffmpeg },
      onExit(proc, exitCode, signalCode, error) {
        if (error) {
          console.error(error);
        } else {
          console.log(`Encoder exited with code ${exitCode}`);
        }

        encoders.delete(srtUrl);
      },
    });

    const textDecoder = new TextDecoder();

    new Promise(async (resolve, reject) => {
      for await (let line of encoder.stdout.values()) {
        console.log("[ ENCODER", encoder.pid, "]:", textDecoder.decode(line)); 
      }
    });
    
    encoders.set(srtUrl, encoder);

    return encoder;
  }

  public async removeEncoder(srtUrl: string) {
    const encoder = this.encoders.get(srtUrl);

    if (encoder) {
      encoder.kill();
      this.encoders.delete(srtUrl);
    }
  }
}

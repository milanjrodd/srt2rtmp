import { $, env } from "bun";

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

const rtmpUrl = import.meta.env.RTMP_URL;
const srtUrl = import.meta.env.SRT_URL;
const ffmpeg = import.meta.env.FFMPEG;

if (!srtUrl) throw new Error("SRT URL is required");
if (!rtmpUrl) throw new Error("RTMP URL is required");
if (!ffmpeg) throw new Error("FFMPEG path is required");

const encoderOptions: IEncoderOptions = {
  audioSamplingRate: 44100,
  videoBitrate: 8000,
  inputBufferSizeInKB: 1024,
  reconnectDelayInSeconds: 2,
  frameRate: 48,
  preset: "superfast",
  bframes: 2,
}

const srtParams = {
  recv_buffer_size: encoderOptions.inputBufferSizeInKB * 1024,
  snddropdelay: encoderOptions.reconnectDelayInSeconds * 1000 * 1000,
};

const srtUrlWithParams = new URL(srtUrl);
for (const [key, value] of Object.entries(srtParams)) {
  srtUrlWithParams.searchParams.append(key, value.toString());
}

const args = {
  i: srtUrlWithParams.toString(),
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

await $`${ffmpeg} -re -i ${args.i} -ar ${args.ar} -c:v ${args.cv} -x264opts ${args.x264opts} -preset ${args.preset} -c:a ${args.ca} -b:a ${args.ba} -b:v ${args.bv} -bufsize ${args.bufsize} -filter:v ${args.filterv} -f ${args.f} ${rtmpUrl}`;
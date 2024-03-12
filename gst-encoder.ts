import { $ } from "bun";

const blocksize = 1024 * 1024; // 1MB
const audioSamplingRate = 48000;
const audioBitrate = 128000;
const videoBitrate = 3000;

const rtmpUrl = import.meta.env.RTMP_URL;
const srtUrl = import.meta.env.SRT_URL;
const gst = import.meta.env.GST;

await $`${gst} srtsrc uri=${srtUrl} blocksize=${blocksize} mode="caller" auto-reconnect=false ! tsdemux \
! queue ! decodebin name=src \
\
src. ! queue ! x264enc cabac=1 bframes=2 ref=1 bitrate=${videoBitrate} ! "video/x-h264,profile=main" ! mux. \
\
src. ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=${audioSamplingRate},channels=2 ! faac bitrate=${audioBitrate} \
\
! queue ! flvmux name=mux streamable=true ! queue ! rtmpsink location=${rtmpUrl}`

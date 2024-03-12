#################################
# bun builder
#################################

FROM oven/bun AS bun-builder
WORKDIR /app
COPY bun.lockb .
COPY package.json .
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./index.ts --compile --outfile srt2rtmp
RUN bun build ./encoder.ts --compile --outfile encoder

#################################
# prodduction stage
#################################
FROM restreamio/gstreamer:2024-01-19T15-42-01Z-prod-dbg AS release
RUN gst-launch-1.0 --version
COPY --from=bun-builder /app/srt2rtmp /app/
COPY --from=bun-builder /app/encoder /app/
EXPOSE 3000/tcp
RUN chmod +x /app/srt2rtmp
ENTRYPOINT ["/app/srt2rtmp"]
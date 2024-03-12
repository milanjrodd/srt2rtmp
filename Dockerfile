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

#################################
# prodduction stage
#################################
FROM restreamio/gstreamer AS release
COPY --from=bun-builder /app/srt2rtmp /app/srt2rtmp
EXPOSE 3000/tcp
RUN chmod +x /app/srt2rtmp
ENTRYPOINT ["/app/srt2rtmp"]
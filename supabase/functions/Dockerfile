FROM denoland/deno:2.1.4

WORKDIR /app

# Copy all functions
COPY . .

# Cache dependencies
RUN deno cache send-push/index.ts

EXPOSE 8082

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "send-push/index.ts"]

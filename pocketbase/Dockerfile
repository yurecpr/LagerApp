FROM alpine:3.22
ARG PB_VERSION=0.40.4
ARG TARGETARCH=amd64
RUN apk add --no-cache ca-certificates unzip wget \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" -O /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip pocketbase -d /usr/local/bin \
    && rm /tmp/pocketbase.zip
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb_migrations", "--hooksDir=/pb_hooks"]

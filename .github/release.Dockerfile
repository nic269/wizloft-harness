FROM node:24.20.0-bookworm@sha256:9137a20e25879e0b557227b57e3ee4e9af4bde29eb3db66134cd1723e84f830b

ENV COREPACK_HOME=/opt/corepack

RUN test "$(node --version)" = "v24.20.0" \
  && test "$(npm --version)" = "11.19.0" \
  && mkdir --mode=0755 "$COREPACK_HOME" \
  && corepack enable \
  && corepack install --global pnpm@11.10.0 \
  && test "$(pnpm --version)" = "11.10.0"

WORKDIR /workspace

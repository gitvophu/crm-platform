# Image chạy toolchain dev (ADR-0002). Không chứa source: repo được bind mount vào /workspace.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-trixie-slim

# Từ Node 25, Corepack không còn đi kèm Node.
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@0.36.0 && corepack enable

# Tải sẵn đúng bản pnpm ghim trong `packageManager`. package.json đổi thì layer này build lại.
WORKDIR /opt/pnpm-version
COPY package.json ./
# `pnpm -v`: pnpm 12 tải binary native vào thư mục cài của nó ở lần chạy đầu. Chạy lúc build để
# binary nằm trong image, không phải tải lại mỗi container.
# Container chạy bằng UID của host (không cố định), nên cache Corepack phải ghi được với mọi user.
RUN corepack install && pnpm -v && chmod -R a+rwX "$COREPACK_HOME"

# HOME là named volume: giữ pnpm store và cache giữa các lần `docker compose run`.
# Volume mới tạo thừa hưởng owner của thư mục này (UID 1000, xem Q7 của slice 0.2).
RUN mkdir -p /home/dev/.pnpm-store && chown -R 1000:1000 /home/dev
# Phải đặt store-dir rõ ràng: store khác filesystem với repo thì pnpm tự đặt store vào
# node_modules/.pnpm-store. pnpm 12 chỉ đọc biến `pnpm_config_*`, bỏ qua `npm_config_*`.
ENV HOME=/home/dev \
    pnpm_config_store_dir=/home/dev/.pnpm-store \
    TURBO_TELEMETRY_DISABLED=1

WORKDIR /workspace

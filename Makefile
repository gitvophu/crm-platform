# Mọi lệnh dev chạy trong service `dev` của compose.yaml (ADR-0002). Host chỉ cần Docker + make.

UID := $(shell id -u)
GID := $(shell id -g)
NODE_VERSION := $(shell cat .nvmrc)
export UID GID NODE_VERSION

RUN := docker compose run --rm dev
DB_UP := docker compose up -d --wait postgres

.DEFAULT_GOAL := help
.PHONY: help image install lint typecheck test build format pnpm sh up restart down migrate migration

help: ## Liệt kê các lệnh
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

# compose.yaml đọc .env (slice 0.3, Q15).
.env:
	@echo 'Thiếu file .env. Chạy: cp .env.example .env' >&2; exit 1

image: .env ## Build lại image dev
	docker compose build dev

install: .env ## pnpm install
	$(RUN) pnpm install

lint: .env ## Prettier check + ESLint
	$(RUN) pnpm lint

typecheck: .env ## tsc --noEmit cho mọi package
	$(RUN) pnpm typecheck

test: .env ## Vitest cho mọi package (tự bật postgres)
	$(DB_UP)
	$(RUN) pnpm test

build: .env ## Build mọi package
	$(RUN) pnpm build

format: .env ## Prettier --write
	$(RUN) pnpm format

pnpm: .env ## Lệnh pnpm bất kỳ: make pnpm ARGS="add -D x --filter @crm/api"
	$(RUN) pnpm $(ARGS)

sh: .env ## Mở shell trong container
	$(RUN) bash

up: .env ## Chạy cả stack: tự cài dependency, build shared, migrate (web ở localhost:5173)
	docker compose up -d --wait

restart: .env ## Sau khi sửa packages/shared hoặc pull khi stack đang chạy: chạy lại setup, tạo lại api + web
	docker compose run --rm setup
	docker compose up -d --wait --force-recreate --no-deps api web

down: .env ## Dừng các service
	docker compose down

migrate: .env ## Áp migration lên DB dev: chạy lại service setup (install, build shared, migrate deploy)
	docker compose run --rm setup

migration: .env ## Tạo migration mới, chưa áp: make migration NAME=add_contact
	@test -n '$(NAME)' || { echo 'Thiếu tên migration. Ví dụ: make migration NAME=add_contact' >&2; exit 1; }
	@echo '$(NAME)' | grep -Eq '^[a-z0-9_]+$$' || { echo 'NAME chỉ gồm a-z, 0-9, _. Ví dụ: make migration NAME=add_contact' >&2; exit 1; }
	$(DB_UP)
	$(RUN) pnpm --filter @crm/api exec prisma migrate dev --create-only --name $(NAME)

# Mọi lệnh dev chạy trong service `dev` của compose.yaml (ADR-0002). Host chỉ cần Docker + make.

UID := $(shell id -u)
GID := $(shell id -g)
NODE_VERSION := $(shell cat .nvmrc)
export UID GID NODE_VERSION

RUN := docker compose run --rm dev

.DEFAULT_GOAL := help
.PHONY: help image install lint typecheck test build format pnpm sh

help: ## Liệt kê các lệnh
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

image: ## Build lại image dev
	docker compose build dev

install: ## pnpm install
	$(RUN) pnpm install

lint: ## Prettier check + ESLint
	$(RUN) pnpm lint

typecheck: ## tsc --noEmit cho mọi package
	$(RUN) pnpm typecheck

test: ## Vitest cho mọi package
	$(RUN) pnpm test

build: ## Build mọi package
	$(RUN) pnpm build

format: ## Prettier --write
	$(RUN) pnpm format

pnpm: ## Lệnh pnpm bất kỳ: make pnpm ARGS="add -D x --filter @crm/api"
	$(RUN) pnpm $(ARGS)

sh: ## Mở shell trong container
	$(RUN) bash

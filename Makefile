SHELL := /bin/bash

.PHONY: up down logs fmt lint test dbshell

up:
	docker compose up -d --build

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

dbshell:
	docker compose exec db psql -U $$POSTGRES_USER -d $$POSTGRES_DB

fmt:
	# TODO: add formatters (ruff/black, prettier)

lint:
	# TODO: add linters (ruff, eslint)

test:
	# TODO: add tests (pytest, vitest)

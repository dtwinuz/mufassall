#!/usr/bin/env bash
# Admin-side deploy tools. Day-to-day deploys run in GitHub Actions (.github/workflows/deploy.yml);
# this script is for the server owner, over an ordinary admin SSH login.
#
#   bash deploy/deploy.sh bootstrap [host]   install or update the server-managed files:
#                                            bin/receive, docker-compose.yml, the container
#   bash deploy/deploy.sh ship [host]        build clean origin/main locally and publish it
#                                            (the same path CI uses, for when Actions is down)
#   bash deploy/deploy.sh rollback [host]    switch back to the previous release
#   bash deploy/deploy.sh status [host]      print the live commit
#
# API container (mufassall-api, apps/api/server.mjs): bootstrap ships apps/api/*.mjs (no tests) to
# $REMOTE_DIR/api, creates data/ (uid 1000) and an empty api.env (mode 600), and restarts the
# container when the API files change. CI deploys never touch it; the site Caddy proxies /api/*.
#
#   Settings, all optional, in $REMOTE_DIR/api.env (KEY=value lines, never committed):
#     ADMIN_TOKEN=<long random>   enables GET /api/feedback/summary (Authorization: Bearer <token>)
#     TG_BOT_TOKEN=<token>        enables the Telegram bot: create it with @BotFather (/newbot),
#                                 optionally /setcommands: start, karta, card, obuna, subscribe, stop, til, lang
#     ADMIN_CHAT_ID=<number>      chat that gets gallery submissions (Approve/Reject buttons) and
#                                 "error" feedback; your id: send /start to @userinfobot, or a group id
#   After editing: cd $REMOTE_DIR && docker compose up -d --force-recreate mufassall-api
#
#   Gallery moderation (besides the bot buttons):
#     docker exec mufassall-api node /app/server.mjs list
#     docker exec mufassall-api node /app/server.mjs approve <id>    # reject <id> deletes it
#   Data: $REMOTE_DIR/data/{feedback.jsonl,gallery.json,subscribers.json}; no IPs are stored.
set -euo pipefail

MODE="${1:-}"
HOST="${2:-dtwin}"
REMOTE_DIR="${REMOTE_DIR:-/opt/mufassall-site}"
URL="${URL:-https://mufassall.dtwin.uz}"

fail() { echo "deploy: $*" >&2; exit 1; }
cd "$(dirname "$0")/.."

case "$MODE" in
  bootstrap)
    # docker-compose.yml and receive stay server-managed: CI can publish files, not change containers.
    pnpm build >/dev/null
    mapfile -t API_FILES < <(find apps/api -maxdepth 1 -type f -name '*.mjs' ! -name '*.test.mjs' | sort)
    [ "${#API_FILES[@]}" -gt 0 ] || fail "apps/api has no .mjs files"
    tar -czf - deploy/receive.sh deploy/docker-compose.yml deploy/Caddyfile "${API_FILES[@]}" | ssh "$HOST" "set -euo pipefail
      mkdir -p '$REMOTE_DIR'; cd '$REMOTE_DIR'
      T=\$(mktemp -d); trap 'rm -rf \"\$T\"' EXIT
      tar --no-same-owner -xzf - -C \"\$T\"
      install -d -m 755 bin conf releases api
      [ -d data ] || install -d -m 750 -o 1000 -g 1000 data
      [ -f api.env ] || install -m 600 /dev/null api.env
      install -m 755 -o root -g root \"\$T/deploy/receive.sh\" bin/receive
      [ -f conf/Caddyfile ] || install -m 644 \"\$T/deploy/Caddyfile\" conf/Caddyfile
      API_CHANGED=0
      if [ \"\$(cd \"\$T/apps/api\" && sha256sum *.mjs)\" != \"\$(cd api && sha256sum *.mjs 2>/dev/null || true)\" ]; then
        rm -f api/*.mjs; install -m 644 -o root -g root \"\$T\"/apps/api/*.mjs api/; API_CHANGED=1
      fi
      if ! cmp -s \"\$T/deploy/docker-compose.yml\" docker-compose.yml; then
        install -m 644 \"\$T/deploy/docker-compose.yml\" docker-compose.yml
        docker compose up -d --force-recreate --remove-orphans
      elif [ \"\$API_CHANGED\" = 1 ]; then
        docker compose up -d --force-recreate mufassall-api
      else
        docker compose up -d
      fi
      # through the site container: the same network path Caddy uses for /api/*
      for i in \$(seq 1 15); do
        if docker exec mufassall-site wget -qO- http://mufassall-api:8080/api/health 2>/dev/null | grep -qx ok; then echo 'api: ok'; break; fi
        if [ \"\$i\" = 15 ]; then echo 'api: health check failed, see: docker logs mufassall-api' >&2; exit 1; fi
        sleep 2
      done
      echo \"bootstrap ok (api \$([ \"\$API_CHANGED\" = 1 ] && echo updated || echo unchanged)), live: \$(readlink releases/current 2>/dev/null || echo none)\""
    ;;
  ship)
    git fetch --quiet origin main
    [ -z "$(git status --porcelain)" ] || fail "uncommitted changes"
    SHA="$(git rev-parse HEAD)"
    [ "$SHA" = "$(git rev-parse origin/main)" ] || fail "only origin/main can be shipped (HEAD $(git rev-parse --short HEAD))"
    pnpm build && pnpm check:leaks
    printf '%s\n' "$SHA" > apps/web/dist/version.txt
    rm -rf .ship && mkdir .ship && cp -r apps/web/dist .ship/site && cp deploy/Caddyfile .ship/Caddyfile
    tar -czf - -C .ship site Caddyfile | ssh "$HOST" "$REMOTE_DIR/bin/receive deploy $SHA"
    rm -rf .ship
    for _ in $(seq 1 20); do
      if curl -fsS "$URL/version.txt" 2>/dev/null | grep -qx "$SHA"; then echo "live: $SHA -> $URL"; exit 0; fi
      sleep 3
    done
    fail "$URL/version.txt did not return $SHA (roll back: bash deploy/deploy.sh rollback $HOST)"
    ;;
  rollback|status)
    ssh "$HOST" "$REMOTE_DIR/bin/receive $MODE"
    ;;
  *)
    sed -n '2,11p' "$0"; exit 2
    ;;
esac

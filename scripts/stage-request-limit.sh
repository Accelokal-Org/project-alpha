#!/usr/bin/env bash
set -euo pipefail

# Stages only. Inspect `vercel firewall diff` before publishing.
# One shared IP bucket across dynamic application paths; static assets excluded.
vercel firewall rules add 'Deskonekt application request limit' \
  --description 'Limit dynamic portal traffic to 600 requests per minute per IP; exclude static assets.' \
  --condition '{"type":"path","op":"eq","value":"/teacher"}' \
  --or --condition '{"type":"path","op":"pre","value":"/teacher/"}' \
  --or --condition '{"type":"path","op":"eq","value":"/student"}' \
  --or --condition '{"type":"path","op":"pre","value":"/student/"}' \
  --or --condition '{"type":"path","op":"eq","value":"/deskonekt/admin"}' \
  --or --condition '{"type":"path","op":"pre","value":"/deskonekt/admin/"}' \
  --or --condition '{"type":"path","op":"eq","value":"/login"}' \
  --or --condition '{"type":"path","op":"pre","value":"/auth/"}' \
  --action rate_limit --rate-limit-action rate_limit \
  --rate-limit-algo fixed_window --rate-limit-keys ip \
  --rate-limit-requests 600 --rate-limit-window 60 --yes
vercel firewall diff

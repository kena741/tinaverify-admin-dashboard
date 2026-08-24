#!/usr/bin/env bash
# One-shot: mint SA key (if needed) and write GitHub Actions secrets/vars
# so push to staging/production deploys immediately.
#
# Requires: gcloud (project zulu-dine-492112), gh (admin on kena741/zuludine)
set -euo pipefail

PROJECT=zulu-dine-492112
REPO=kena741/zuludine
EMAIL="github-actions-tinaverify@${PROJECT}.iam.gserviceaccount.com"
KEY_FILE=$(mktemp)
trap 'rm -f "$KEY_FILE"' EXIT

gcloud iam service-accounts describe "$EMAIL" --project="$PROJECT" >/dev/null

gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$EMAIL" \
  --project="$PROJECT" \
  --quiet

gh secret set GCP_SA_KEY -R "$REPO" < "$KEY_FILE"
gh secret set GCP_PROJECT_ID -R "$REPO" -b "$PROJECT"

gh api --method PUT "repos/${REPO}/environments/production" >/dev/null
gh api --method PUT "repos/${REPO}/environments/staging" >/dev/null

gh secret set GCP_SA_KEY -R "$REPO" --env staging < "$KEY_FILE"
gh secret set GCP_SA_KEY -R "$REPO" --env production < "$KEY_FILE"
gh secret set GCP_PROJECT_ID -R "$REPO" --env staging -b "$PROJECT"
gh secret set GCP_PROJECT_ID -R "$REPO" --env production -b "$PROJECT"

gh secret set NEXT_PUBLIC_BACKEND_BASE_URL -R "$REPO" --env staging \
  -b "https://zuludine-backend-staging-pvx5z7p4ba-ey.a.run.app"
gh secret set NEXT_PUBLIC_BACKEND_BASE_URL -R "$REPO" --env production \
  -b "https://zuludine-backend-prod-562272610794.europe-west3.run.app"

echo "Done. Push to staging/production (or Actions → Deploy → Run workflow)."

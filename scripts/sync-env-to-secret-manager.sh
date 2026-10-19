#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-zulu-dine-492112}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sync_env_file() {
	local target="$1"
	local env_file="$2"
	local backend_url=""
	local grant_credits=""
	local business_sms=""
	local key value secret_name

	if [[ ! -f "$env_file" ]]; then
		echo "Environment file not found: $env_file" >&2
		return 1
	fi

	while IFS= read -r line || [[ -n "$line" ]]; do
		line="${line%$'\r'}"
		[[ -z "$line" || "$line" == \#* ]] && continue
		[[ "$line" == *=* ]] || {
			echo "Invalid environment entry in $env_file" >&2
			return 1
		}

		key="${line%%=*}"
		value="${line#*=}"
		case "$key" in
			NEXT_PUBLIC_BACKEND_BASE_URL) backend_url="$value" ;;
			NEXT_PUBLIC_ADMIN_GRANT_CREDITS) grant_credits="$value" ;;
			NEXT_PUBLIC_ADMIN_BUSINESS_SMS) business_sms="$value" ;;
			*) continue ;;
		esac
	done < "$env_file"

	for key in NEXT_PUBLIC_BACKEND_BASE_URL NEXT_PUBLIC_ADMIN_GRANT_CREDITS NEXT_PUBLIC_ADMIN_BUSINESS_SMS; do
		case "$key" in
			NEXT_PUBLIC_BACKEND_BASE_URL) value="$backend_url" ;;
			NEXT_PUBLIC_ADMIN_GRANT_CREDITS) value="$grant_credits" ;;
			NEXT_PUBLIC_ADMIN_BUSINESS_SMS) value="$business_sms" ;;
		esac
		if [[ -z "$value" ]]; then
			echo "Missing $key in $env_file" >&2
			return 1
		fi

		secret_name="${key}_${target}"
		if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
			gcloud secrets create "$secret_name" \
				--project="$PROJECT_ID" \
				--replication-policy=automatic
		fi
		printf '%s' "$value" | gcloud secrets versions add "$secret_name" \
			--project="$PROJECT_ID" \
			--data-file=- >/dev/null
		echo "Updated Secret Manager secret $secret_name from $env_file"
	done
}

sync_env_file development "$REPO_ROOT/.env.development"
sync_env_file production "$REPO_ROOT/.env.production"
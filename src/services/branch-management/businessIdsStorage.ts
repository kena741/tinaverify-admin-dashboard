const STORAGE_KEY = "zuluverify_business_ids";

export function getStoredBusinessIds(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed)
			? parsed.filter((x): x is string => typeof x === "string" && x.length > 0)
			: [];
	} catch {
		return [];
	}
}

export function setStoredBusinessIds(ids: string[]): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function addStoredBusinessId(id: string): void {
	if (!id) return;
	const next = new Set(getStoredBusinessIds());
	next.add(id);
	setStoredBusinessIds([...next]);
}

export function removeStoredBusinessId(id: string): void {
	setStoredBusinessIds(getStoredBusinessIds().filter((x) => x !== id));
}

export function normalizeAdminPath(p: string) {
	if (p === "/") return p;
	return p.replace(/\/$/, "") || "/";
}

export function adminPathMatches(pathname: string, href: string) {
	const path = normalizeAdminPath(pathname);
	const base = normalizeAdminPath(href);
	if (path === base) return true;
	return base !== "/admin" && path.startsWith(`${base}/`);
}

/**
 * Admin UI feature gates. Values are baked at `next build` via NEXT_PUBLIC_*.
 * Local `next dev` always enables grant credits; deployed builds use NEXT_PUBLIC_*.
 */
export const ADMIN_FEATURE = {
	grantCredits:
		process.env.NODE_ENV === "development" ||
		process.env.NEXT_PUBLIC_ADMIN_GRANT_CREDITS === "true",
	/** Business SMS API not shipped yet. */
	businessSms: process.env.NEXT_PUBLIC_ADMIN_BUSINESS_SMS === "true",
} as const;

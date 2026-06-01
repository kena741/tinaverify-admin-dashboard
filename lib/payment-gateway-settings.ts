export type PaymentGatewayKey = "chapa" | "telebirr";

export type PaymentGatewaySettings = {
	chapa: { enabled: boolean };
	telebirr: { enabled: boolean };
};

const STORAGE_KEY = "zuluverify_payment_gateway_settings";

export const defaultPaymentGatewaySettings: PaymentGatewaySettings = {
	chapa: { enabled: true },
	telebirr: { enabled: true },
};

export function loadPaymentGatewaySettings(): PaymentGatewaySettings {
	if (typeof window === "undefined") return defaultPaymentGatewaySettings;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultPaymentGatewaySettings;
		const parsed = JSON.parse(raw) as Partial<PaymentGatewaySettings>;
		return {
			chapa: {
				enabled:
					parsed.chapa?.enabled ?? defaultPaymentGatewaySettings.chapa.enabled,
			},
			telebirr: {
				enabled:
					parsed.telebirr?.enabled ??
					defaultPaymentGatewaySettings.telebirr.enabled,
			},
		};
	} catch {
		return defaultPaymentGatewaySettings;
	}
}

export function savePaymentGatewaySettings(settings: PaymentGatewaySettings) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

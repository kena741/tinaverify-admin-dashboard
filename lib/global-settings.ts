export type PolicyDocument = {
	id: string;
	title: string;
	content: string;
	updatedAt: string;
};

export type ContactInfo = {
	supportEmail: string;
	supportPhone: string;
	officeAddress: string;
	businessHours: string;
	website: string;
};

export type GlobalSettings = {
	policies: PolicyDocument[];
	contact: ContactInfo;
};

const STORAGE_KEY = "zuluverify_global_settings";

export const defaultContactInfo: ContactInfo = {
	supportEmail: "",
	supportPhone: "",
	officeAddress: "",
	businessHours: "",
	website: "",
};

export const defaultGlobalSettings: GlobalSettings = {
	policies: [],
	contact: defaultContactInfo,
};

export function loadGlobalSettings(): GlobalSettings {
	if (typeof window === "undefined") return defaultGlobalSettings;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultGlobalSettings;
		const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
		return {
			policies: Array.isArray(parsed.policies) ? parsed.policies : [],
			contact: { ...defaultContactInfo, ...parsed.contact },
		};
	} catch {
		return defaultGlobalSettings;
	}
}

export function saveGlobalSettings(settings: GlobalSettings) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function createPolicyId() {
	return `policy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

import type {
	GlobalSettingOutput,
	GlobalSettingWriteRequest,
} from "@/services/types";

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

export function createPolicyId() {
	return `policy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function policiesFromApi(
	raw: Record<string, unknown> | null | undefined,
): PolicyDocument[] {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
	return Object.entries(raw).map(([id, value]) => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const v = value as Record<string, unknown>;
			return {
				id,
				title: typeof v.title === "string" ? v.title : id,
				content:
					typeof v.content === "string"
						? v.content
						: typeof v.body === "string"
							? v.body
							: "",
				updatedAt:
					typeof v.updatedAt === "string"
						? v.updatedAt
						: typeof v.updated_at === "string"
							? v.updated_at
							: new Date(0).toISOString(),
			};
		}
		if (typeof value === "string") {
			return {
				id,
				title: id,
				content: value,
				updatedAt: new Date(0).toISOString(),
			};
		}
		return {
			id,
			title: id,
			content: "",
			updatedAt: new Date(0).toISOString(),
		};
	});
}

export function policiesToApi(
	policies: PolicyDocument[],
): Record<string, { title: string; content: string; updatedAt: string }> {
	return Object.fromEntries(
		policies.map((p) => [
			p.id,
			{ title: p.title, content: p.content, updatedAt: p.updatedAt },
		]),
	);
}

export function globalSettingsFromApi(
	remote: GlobalSettingOutput,
): GlobalSettings {
	return {
		policies: policiesFromApi(remote.policies),
		contact: {
			supportEmail: remote.email ?? "",
			supportPhone: remote.phone ?? "",
			officeAddress: remote.office_address ?? "",
			businessHours: remote.business_hours ?? "",
			website: remote.website ?? "",
		},
	};
}

export function globalSettingsToWriteRequest(
	settings: GlobalSettings,
	generalUse: Record<string, unknown> | null = {},
): GlobalSettingWriteRequest {
	return {
		email: settings.contact.supportEmail.trim() || null,
		phone: settings.contact.supportPhone.trim() || null,
		website: settings.contact.website.trim() || null,
		office_address: settings.contact.officeAddress.trim() || null,
		business_hours: settings.contact.businessHours.trim() || null,
		policies: policiesToApi(settings.policies),
		general_use: generalUse ?? {},
	};
}

export type GeneralUseRow = {
	key: string;
	value: string;
};

export function generalUseToRows(
	raw: Record<string, unknown> | null | undefined,
): GeneralUseRow[] {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
	return Object.entries(raw).map(([key, value]) => ({
		key,
		value:
			typeof value === "string"
				? value
				: value === null || value === undefined
					? ""
					: JSON.stringify(value),
	}));
}

export function rowsToGeneralUse(rows: GeneralUseRow[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const row of rows) {
		const key = row.key.trim();
		if (!key) continue;
		const trimmed = row.value.trim();
		if (trimmed === "") {
			out[key] = "";
			continue;
		}
		try {
			out[key] = JSON.parse(trimmed) as unknown;
		} catch {
			out[key] = row.value;
		}
	}
	return out;
}

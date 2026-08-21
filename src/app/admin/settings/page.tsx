"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	CreditCardIcon,
	GlobeIcon,
	KeyRoundIcon,
	Loader2Icon,
	MailIcon,
	PencilIcon,
	PlusIcon,
	ShieldIcon,
	Trash2Icon,
} from "lucide-react";

import { PlansAdminPanel } from "@/app/admin/plans/page";
import { RolesAdminPanel } from "@/app/admin/roles/page";
import { PageHeader } from "@/components/admin/page-header";
import {
	createPolicyId,
	defaultContactInfo,
	defaultGlobalSettings,
	generalUseToRows,
	globalSettingsFromApi,
	globalSettingsToWriteRequest,
	rowsToGeneralUse,
	type ContactInfo,
	type GeneralUseRow,
	type GlobalSettings,
	type PolicyDocument,
} from "@/lib/global-settings";
import {
	useCreateGlobalSettingMutation,
	useListGlobalSettingsQuery,
	useUpdateGlobalSettingMutation,
} from "@/services/global-settings/globalSettingsApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type PolicyFormState = {
	id: string | null;
	title: string;
	content: string;
};

const emptyPolicyForm = (): PolicyFormState => ({
	id: null,
	title: "",
	content: "",
});

const SETTINGS_TABS = [
	"general",
	"policies",
	"contact",
	"plans",
	"roles",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function parseSettingsTab(raw: string | null): SettingsTab {
	if (raw && SETTINGS_TABS.includes(raw as SettingsTab)) {
		return raw as SettingsTab;
	}
	return "general";
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown; message?: unknown } }).data
	) {
		const data = (error as { data: { detail?: unknown; message?: unknown } })
			.data;
		if (typeof data.detail === "string") return data.detail;
		if (typeof data.message === "string") return data.message;
		if (Array.isArray(data.detail)) {
			const messages = data.detail
				.map((item) =>
					typeof item === "object" &&
					item !== null &&
					"msg" in item &&
					typeof item.msg === "string"
						? item.msg
						: null,
				)
				.filter(Boolean);
			if (messages.length > 0) return messages.join(", ");
		}
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

export default function GlobalSettingsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const activeTab = parseSettingsTab(searchParams.get("tab"));

	const {
		data: remoteList,
		isLoading,
		isError,
		error,
		refetch,
	} = useListGlobalSettingsQuery();
	const [createSetting] = useCreateGlobalSettingMutation();
	const [updateSetting] = useUpdateGlobalSettingMutation();

	const [settingId, setSettingId] = useState<string | null>(null);
	const [generalUse, setGeneralUse] = useState<Record<string, unknown>>({});
	const [generalRows, setGeneralRows] = useState<GeneralUseRow[]>([]);
	const [settings, setSettings] = useState<GlobalSettings | null>(null);
	const [contactDraft, setContactDraft] =
		useState<ContactInfo>(defaultContactInfo);
	const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
	const [policyForm, setPolicyForm] = useState<PolicyFormState>(emptyPolicyForm);
	const [policyFormError, setPolicyFormError] = useState("");
	const [savingContact, setSavingContact] = useState(false);
	const [savingPolicy, setSavingPolicy] = useState(false);
	const [savingGeneral, setSavingGeneral] = useState(false);
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		title: string;
		message: string;
	} | null>(null);

	useEffect(() => {
		if (!remoteList) return;
		const remote = remoteList[0];
		if (!remote) {
			setSettingId(null);
			setGeneralUse({});
			setGeneralRows([]);
			setSettings(defaultGlobalSettings);
			setContactDraft(defaultContactInfo);
			return;
		}
		const mapped = globalSettingsFromApi(remote);
		const nextGeneral =
			remote.general_use &&
			typeof remote.general_use === "object" &&
			!Array.isArray(remote.general_use)
				? remote.general_use
				: {};
		setSettingId(remote.id);
		setGeneralUse(nextGeneral);
		setGeneralRows(generalUseToRows(nextGeneral));
		setSettings(mapped);
		setContactDraft(mapped.contact);
	}, [remoteList]);

	const persist = useCallback(
		async (
			next: GlobalSettings,
			nextGeneralUse: Record<string, unknown> = generalUse,
		) => {
			const body = globalSettingsToWriteRequest(next, nextGeneralUse);
			if (settingId) {
				const updated = await updateSetting({
					settingId,
					body,
				}).unwrap();
				const savedGeneral =
					updated.general_use &&
					typeof updated.general_use === "object" &&
					!Array.isArray(updated.general_use)
						? updated.general_use
						: {};
				setSettingId(updated.id);
				setGeneralUse(savedGeneral);
				setGeneralRows(generalUseToRows(savedGeneral));
			} else {
				const created = await createSetting(body).unwrap();
				const savedGeneral =
					created.general_use &&
					typeof created.general_use === "object" &&
					!Array.isArray(created.general_use)
						? created.general_use
						: {};
				setSettingId(created.id);
				setGeneralUse(savedGeneral);
				setGeneralRows(generalUseToRows(savedGeneral));
			}
			setSettings(next);
		},
		[createSetting, generalUse, settingId, updateSetting],
	);

	const openAddPolicy = () => {
		setPolicyForm(emptyPolicyForm());
		setPolicyFormError("");
		setPolicyDialogOpen(true);
	};

	const openEditPolicy = (policy: PolicyDocument) => {
		setPolicyForm({
			id: policy.id,
			title: policy.title,
			content: policy.content,
		});
		setPolicyFormError("");
		setPolicyDialogOpen(true);
	};

	const handleSavePolicy = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!settings) return;

		const title = policyForm.title.trim();
		const content = policyForm.content.trim();
		if (!title) {
			setPolicyFormError("Policy title is required.");
			return;
		}
		if (!content) {
			setPolicyFormError("Policy content is required.");
			return;
		}

		setSavingPolicy(true);
		setPolicyFormError("");
		setBanner(null);

		try {
			const now = new Date().toISOString();
			let policies: PolicyDocument[];

			if (policyForm.id) {
				policies = settings.policies.map((p) =>
					p.id === policyForm.id
						? { ...p, title, content, updatedAt: now }
						: p,
				);
			} else {
				policies = [
					...settings.policies,
					{ id: createPolicyId(), title, content, updatedAt: now },
				];
			}

			await persist({ ...settings, policies });
			setPolicyDialogOpen(false);
			setBanner({
				variant: "default",
				title: policyForm.id ? "Policy updated" : "Policy added",
				message: `"${title}" has been saved.`,
			});
		} catch (err) {
			setPolicyFormError(
				getErrorMessage(err, "Could not save policy. Try again."),
			);
		} finally {
			setSavingPolicy(false);
		}
	};

	const handleDeletePolicy = async (policy: PolicyDocument) => {
		if (!settings) return;
		if (!window.confirm(`Delete "${policy.title}"? This cannot be undone.`))
			return;

		setBanner(null);
		try {
			await persist({
				...settings,
				policies: settings.policies.filter((p) => p.id !== policy.id),
			});
			setBanner({
				variant: "default",
				title: "Policy removed",
				message: `"${policy.title}" was deleted.`,
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Delete failed",
				message: getErrorMessage(err, "Could not delete policy."),
			});
		}
	};

	const handleSaveContact = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!settings) return;

		setSavingContact(true);
		setBanner(null);

		try {
			await persist({ ...settings, contact: contactDraft });
			setBanner({
				variant: "default",
				title: "Contact info saved",
				message: "Support contact details have been updated.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Save failed",
				message: getErrorMessage(
					err,
					"Could not save contact information. Try again.",
				),
			});
		} finally {
			setSavingContact(false);
		}
	};

	const handleSaveGeneral = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!settings) return;

		const keys = generalRows.map((r) => r.key.trim()).filter(Boolean);
		if (new Set(keys).size !== keys.length) {
			setBanner({
				variant: "destructive",
				title: "Save failed",
				message: "Duplicate keys are not allowed in general settings.",
			});
			return;
		}

		setSavingGeneral(true);
		setBanner(null);
		try {
			const nextGeneral = rowsToGeneralUse(generalRows);
			await persist(settings, nextGeneral);
			setBanner({
				variant: "default",
				title: "General settings saved",
				message: "Platform key/value settings have been updated.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Save failed",
				message: getErrorMessage(err, "Could not save general settings."),
			});
		} finally {
			setSavingGeneral(false);
		}
	};

	const settingsBusy = isLoading || settings === null;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Global settings"
				description="Policies, contact info, subscription plans, and roles & permissions."
			/>

			{banner ? (
				<Alert
					variant={banner.variant === "destructive" ? "destructive" : "default"}
				>
					<AlertTitle>{banner.title}</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			{isError ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load global settings</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<button
							type="button"
							className="text-sm font-medium underline"
							onClick={() => void refetch()}
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : null}

			<Tabs
				value={activeTab}
				onValueChange={(value) => {
					router.replace(`/admin/settings?tab=${value}`, { scroll: false });
				}}
				className="gap-6"
			>
				<TabsList
					variant="line"
					className="h-auto w-full flex-wrap justify-start gap-6 rounded-none border-b border-border bg-transparent p-0"
				>
					<TabsTrigger
						value="general"
						className="gap-2 rounded-none px-0 pb-3 text-primary/70 data-active:text-primary after:bg-primary"
					>
						<GlobeIcon className="size-4" aria-hidden />
						General
					</TabsTrigger>
					<TabsTrigger
						value="policies"
						className="gap-2 rounded-none px-0 pb-3 text-primary/70 data-active:text-primary after:bg-primary"
					>
						<ShieldIcon className="size-4" aria-hidden />
						Policies
					</TabsTrigger>
					<TabsTrigger
						value="contact"
						className="gap-2 rounded-none px-0 pb-3 text-primary/70 data-active:text-primary after:bg-primary"
					>
						<MailIcon className="size-4" aria-hidden />
						Contact
					</TabsTrigger>
					<TabsTrigger
						value="plans"
						className="gap-2 rounded-none px-0 pb-3 text-primary/70 data-active:text-primary after:bg-primary"
					>
						<CreditCardIcon className="size-4" aria-hidden />
						Plans
					</TabsTrigger>
					<TabsTrigger
						value="roles"
						className="gap-2 rounded-none px-0 pb-3 text-primary/70 data-active:text-primary after:bg-primary"
					>
						<KeyRoundIcon className="size-4" aria-hidden />
						Roles
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="flex flex-col gap-4">
					{settingsBusy ? (
						<div className="flex flex-col gap-4">
							<Skeleton className="h-28 w-full" />
							<Skeleton className="h-48 w-full" />
						</div>
					) : (
						<>
							<Card>
								<CardHeader>
									<CardTitle>Overview</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-3 text-sm sm:grid-cols-3">
									<div>
										<p className="text-muted-foreground">Policies</p>
										<p className="font-medium text-foreground">
											{settings.policies.length}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">Support email</p>
										<p className="font-medium text-foreground">
											{settings.contact.supportEmail.trim() || "—"}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">Support phone</p>
										<p className="font-medium text-foreground">
											{settings.contact.supportPhone.trim() || "—"}
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Platform values</CardTitle>
								</CardHeader>
								<CardContent>
									<form
										onSubmit={handleSaveGeneral}
										className="flex flex-col gap-4"
									>
										<p className="text-sm text-muted-foreground">
											Arbitrary key/value pairs stored in{" "}
											<code className="text-xs">general_use</code>. Values that
											look like JSON (numbers, booleans, objects) are parsed;
											everything else is saved as text.
										</p>

										{generalRows.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No platform values yet.
											</p>
										) : (
											<div className="flex flex-col gap-3">
												{generalRows.map((row, index) => (
													<div
														key={`general-row-${index}`}
														className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
													>
														<Input
															aria-label={`Key ${index + 1}`}
															placeholder="key"
															value={row.key}
															onChange={(e) =>
																setGeneralRows((rows) =>
																	rows.map((r, i) =>
																		i === index
																			? { ...r, key: e.target.value }
																			: r,
																	),
																)
															}
														/>
														<Input
															aria-label={`Value ${index + 1}`}
															placeholder="value"
															value={row.value}
															onChange={(e) =>
																setGeneralRows((rows) =>
																	rows.map((r, i) =>
																		i === index
																			? { ...r, value: e.target.value }
																			: r,
																	),
																)
															}
														/>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="text-destructive hover:text-destructive"
															aria-label={`Remove ${row.key || `row ${index + 1}`}`}
															onClick={() =>
																setGeneralRows((rows) =>
																	rows.filter((_, i) => i !== index),
																)
															}
														>
															<Trash2Icon aria-hidden />
														</Button>
													</div>
												))}
											</div>
										)}

										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													setGeneralRows((rows) => [
														...rows,
														{ key: "", value: "" },
													])
												}
											>
												<PlusIcon data-icon="inline-start" aria-hidden />
												Add value
											</Button>
											<Button type="submit" disabled={savingGeneral}>
												{savingGeneral && (
													<Loader2Icon
														data-icon="inline-start"
														className="animate-spin"
														aria-hidden
													/>
												)}
												{savingGeneral ? "Saving…" : "Save general settings"}
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						</>
					)}
				</TabsContent>

				<TabsContent value="policies" className="flex flex-col gap-4">
					{settingsBusy ? (
						<Skeleton className="h-40 w-full" />
					) : (
						<>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-muted-foreground">
									{settings.policies.length} polic
									{settings.policies.length === 1 ? "y" : "ies"} configured
								</p>
								<Button type="button" size="sm" onClick={openAddPolicy}>
									<PlusIcon data-icon="inline-start" aria-hidden />
									Add policy
								</Button>
							</div>

							{settings.policies.length === 0 ? (
								<Card>
									<CardContent className="py-10 text-center text-sm text-muted-foreground">
										No policies yet. Add privacy policy, terms of service, or
										other documents.
									</CardContent>
								</Card>
							) : (
								<div className="flex flex-col gap-4">
									{settings.policies.map((policy) => (
										<Card key={policy.id}>
											<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
												<div className="min-w-0 flex-1">
													<CardTitle className="text-lg">
														{policy.title}
													</CardTitle>
													<p className="mt-1 text-xs text-muted-foreground">
														Updated{" "}
														{new Date(policy.updatedAt).toLocaleString(
															undefined,
															{
																dateStyle: "medium",
																timeStyle: "short",
															},
														)}
													</p>
												</div>
												<div className="flex shrink-0 gap-1">
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														aria-label={`Edit ${policy.title}`}
														onClick={() => openEditPolicy(policy)}
													>
														<PencilIcon aria-hidden />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														className="text-destructive hover:text-destructive"
														aria-label={`Delete ${policy.title}`}
														onClick={() => void handleDeletePolicy(policy)}
													>
														<Trash2Icon aria-hidden />
													</Button>
												</div>
											</CardHeader>
											<CardContent>
												<p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
													{policy.content}
												</p>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</>
					)}
				</TabsContent>

				<TabsContent value="contact">
					<Card>
						<CardHeader>
							<CardTitle>Contact information</CardTitle>
						</CardHeader>
						<CardContent>
							{settingsBusy ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-24 w-full" />
								</div>
							) : (
								<form
									onSubmit={handleSaveContact}
									className="flex flex-col gap-6"
								>
									<FieldGroup>
										<Field>
											<FieldLabel htmlFor="support-email">
												Support email
											</FieldLabel>
											<Input
												id="support-email"
												type="email"
												value={contactDraft.supportEmail}
												onChange={(e) =>
													setContactDraft((c) => ({
														...c,
														supportEmail: e.target.value,
													}))
												}
												placeholder="support@zuluverify.com"
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor="support-phone">
												Support phone
											</FieldLabel>
											<Input
												id="support-phone"
												type="tel"
												value={contactDraft.supportPhone}
												onChange={(e) =>
													setContactDraft((c) => ({
														...c,
														supportPhone: e.target.value,
													}))
												}
												placeholder="+251 911 234 567"
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor="website">Website</FieldLabel>
											<Input
												id="website"
												type="url"
												value={contactDraft.website}
												onChange={(e) =>
													setContactDraft((c) => ({
														...c,
														website: e.target.value,
													}))
												}
												placeholder="https://zuluverify.com"
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor="office-address">
												Office address
											</FieldLabel>
											<Textarea
												id="office-address"
												value={contactDraft.officeAddress}
												onChange={(e) =>
													setContactDraft((c) => ({
														...c,
														officeAddress: e.target.value,
													}))
												}
												placeholder="Street, city, country"
												rows={3}
											/>
										</Field>
										<Field>
											<FieldLabel htmlFor="business-hours">
												Business hours
											</FieldLabel>
											<Input
												id="business-hours"
												value={contactDraft.businessHours}
												onChange={(e) =>
													setContactDraft((c) => ({
														...c,
														businessHours: e.target.value,
													}))
												}
												placeholder="Mon–Fri, 9:00–17:00 EAT"
											/>
										</Field>
									</FieldGroup>
									<div>
										<Button type="submit" disabled={savingContact}>
											{savingContact && (
												<Loader2Icon
													data-icon="inline-start"
													className="animate-spin"
													aria-hidden
												/>
											)}
											{savingContact ? "Saving…" : "Save contact info"}
										</Button>
									</div>
								</form>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="plans">
					<PlansAdminPanel embedded />
				</TabsContent>

				<TabsContent value="roles">
					<RolesAdminPanel embedded />
				</TabsContent>
			</Tabs>

			<Dialog
				open={policyDialogOpen}
				onOpenChange={(open) => {
					setPolicyDialogOpen(open);
					if (!open) {
						setPolicyForm(emptyPolicyForm());
						setPolicyFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{policyForm.id ? "Edit policy" : "Add policy"}
						</DialogTitle>
						<DialogDescription>
							Enter the policy title and full text shown to users in the app.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSavePolicy} className="flex flex-col gap-4">
						{policyFormError ? (
							<Alert variant="destructive">
								<AlertDescription>{policyFormError}</AlertDescription>
							</Alert>
						) : null}

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="policy-title">Title</FieldLabel>
								<Input
									id="policy-title"
									value={policyForm.title}
									onChange={(e) =>
										setPolicyForm((f) => ({ ...f, title: e.target.value }))
									}
									placeholder="e.g. Privacy Policy"
									required
									autoFocus
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="policy-content">Content</FieldLabel>
								<Textarea
									id="policy-content"
									value={policyForm.content}
									onChange={(e) =>
										setPolicyForm((f) => ({ ...f, content: e.target.value }))
									}
									placeholder="Policy text or HTML…"
									rows={10}
									required
								/>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setPolicyDialogOpen(false)}
								disabled={savingPolicy}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={savingPolicy}>
								{savingPolicy && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{savingPolicy ? "Saving…" : "Save policy"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

"use client";

import { useMemo, useState } from "react";
import {
	LandmarkIcon,
	Loader2Icon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";

import { useListMyBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import {
	useCreateBankAccountMutation,
	useFilterBankAccountsQuery,
	useLazyGetBankAccountQuery,
	useListBankAccountsQuery,
} from "../../../services/bank-accounts/bankAccountsApi";
import type { BankAccountResponse, BankNameEnum } from "../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const BANK_OPTIONS: Array<{ label: string; value: BankNameEnum }> = [
	{ label: "Commercial Bank of Ethiopia", value: "CBE" },
	{ label: "Dashen Bank", value: "DASHEN" },
	{ label: "Awash Bank", value: "AWASH" },
	{ label: "Bank of Abyssinia", value: "ABYSINIA" },
	{ label: "Telebirr", value: "TELEBIRR" },
	{ label: "CBE Birr", value: "CBEBIRR" },
];

const ALL_BANKS_VALUE = "ALL";

type CreateFormState = {
	account_name: string;
	account_number: string;
	bank_name: BankNameEnum | "";
};

function getBankLabel(bankName: BankNameEnum): string {
	return BANK_OPTIONS.find((option) => option.value === bankName)?.label ?? bankName;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown } }).data?.detail
	) {
		const detail = (error as { data: { detail: unknown } }).data.detail;
		if (typeof detail === "string") return detail;
		if (Array.isArray(detail)) {
			const messages = detail
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

function buildCreateValidation(
	businessId: string,
	form: CreateFormState,
): Partial<Record<keyof CreateFormState | "business_id", string>> {
	const errors: Partial<Record<keyof CreateFormState | "business_id", string>> = {};

	if (!businessId) {
		errors.business_id = "Select a business before creating a bank account.";
	}
	if (!form.bank_name) {
		errors.bank_name = "Choose a bank.";
	}
	if (!form.account_name.trim()) {
		errors.account_name = "Account name is required.";
	}
	if (!form.account_number.trim()) {
		errors.account_number = "Account number is required.";
	}

	return errors;
}

function matchesLookupResult(
	selectedAccountNumber: string,
	lookupAccount?: BankAccountResponse,
): boolean {
	return Boolean(
		selectedAccountNumber &&
			lookupAccount &&
			selectedAccountNumber === lookupAccount.account_number,
	);
}

export default function BankAccountsPage() {
	const [businessId, setBusinessId] = useState("");
	const [bankFilter, setBankFilter] = useState<BankNameEnum | typeof ALL_BANKS_VALUE>(
		ALL_BANKS_VALUE,
	);
	const [lookupAccountNumber, setLookupAccountNumber] = useState("");
	const [lookupError, setLookupError] = useState<string | null>(null);
	const [selectedAccountNumber, setSelectedAccountNumber] = useState("");
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createValidation, setCreateValidation] = useState<
		Partial<Record<keyof CreateFormState | "business_id", string>>
	>({});
	const [createForm, setCreateForm] = useState<CreateFormState>({
		account_name: "",
		account_number: "",
		bank_name: "",
	});

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const shouldUseFilteredEndpoint =
		Boolean(businessId) && bankFilter !== ALL_BANKS_VALUE;

	const {
		data: listAccounts = [],
		isLoading: listLoading,
		isFetching: listFetching,
		error: listError,
	} = useListBankAccountsQuery(
		{ businessId },
		{ skip: !businessId || shouldUseFilteredEndpoint },
	);

	const {
		data: filteredAccounts = [],
		isLoading: filteredLoading,
		isFetching: filteredFetching,
		error: filteredError,
	} = useFilterBankAccountsQuery(
		{ businessId, bankName: bankFilter as BankNameEnum },
		{ skip: !businessId || !shouldUseFilteredEndpoint },
	);

	const [
		triggerLookup,
		{
			data: lookupAccount,
			isFetching: lookupFetching,
			error: lookupRequestError,
		},
	] = useLazyGetBankAccountQuery();

	const [createBankAccount, { isLoading: creating }] =
		useCreateBankAccountMutation();

	const selectedBusiness = useMemo(
		() => businesses.find((business) => business.id === businessId) ?? null,
		[businessId, businesses],
	);

	const accounts = shouldUseFilteredEndpoint ? filteredAccounts : listAccounts;
	const accountsLoading = shouldUseFilteredEndpoint ? filteredLoading : listLoading;
	const accountsFetching = shouldUseFilteredEndpoint
		? filteredFetching
		: listFetching;
	const accountsError = shouldUseFilteredEndpoint ? filteredError : listError;

	const detailAccount = useMemo(() => {
		const fromList =
			accounts.find((account) => account.account_number === selectedAccountNumber) ??
			null;
		if (fromList) return fromList;
		return matchesLookupResult(selectedAccountNumber, lookupAccount)
			? lookupAccount
			: null;
	}, [accounts, lookupAccount, selectedAccountNumber]);

	const totalAccounts = accounts.length;
	const activeAccounts = accounts.filter((account) => !account.is_archived).length;
	const archivedAccounts = totalAccounts - activeAccounts;

	const createBusinessName = useMemo(
		() =>
			businesses.find((business) => business.id === businessId)?.name ?? "",
		[businessId, businesses],
	);

	const resetCreateForm = () => {
		setCreateError(null);
		setCreateValidation({});
		setCreateForm({
			account_name: "",
			account_number: "",
			bank_name: "",
		});
	};

	const handleLookup = async (event: React.FormEvent) => {
		event.preventDefault();
		setLookupError(null);

		const accountNumber = lookupAccountNumber.trim();
		if (!accountNumber) {
			setLookupError("Enter an account number to look up.");
			return;
		}

		try {
			const result = await triggerLookup({ accountNumber }).unwrap();
			setSelectedAccountNumber(result.account_number);
		} catch (error) {
			setLookupError(
				getErrorMessage(error, "Could not fetch the bank account details."),
			);
		}
	};

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreateError(null);

		const validation = buildCreateValidation(businessId, createForm);
		setCreateValidation(validation);
		if (Object.keys(validation).length > 0) return;

		try {
			const created = await createBankAccount({
				business_id: businessId,
				bank_name: createForm.bank_name as BankNameEnum,
				account_name: createForm.account_name.trim(),
				account_number: createForm.account_number.trim(),
			}).unwrap();
			setSelectedAccountNumber(created.account_number);
			setLookupAccountNumber(created.account_number);
			resetCreateForm();
			setCreateDialogOpen(false);
		} catch (error) {
			setCreateError(
				getErrorMessage(error, "Could not create the bank account."),
			);
		}
	};

	return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Bank Accounts
						</h1>
						<p className="text-sm text-muted-foreground">
							Manage the your bank accounts for your businesses:
							create accounts, list them, filter by bank, and fetch a single
							account by account number.
						</p>
					</div>
					<Button
						type="button"
						onClick={() => {
							setCreateDialogOpen(true);
							setCreateError(null);
						}}
					>
						<PlusIcon data-icon="inline-start" />
						Add Bank Account
					</Button>
				</div>
			</header>

			<section className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Total Accounts</CardTitle>
						<CardDescription>
							For the selected business and filter.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{totalAccounts}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Active</CardTitle>
						<CardDescription>Available for incoming verification.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{activeAccounts}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Archived</CardTitle>
						<CardDescription>Returned by the API as archived.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{archivedAccounts}</p>
					</CardContent>
				</Card>
			</section>

			<section className="w-full">
				<Card>
					<CardHeader>
						<CardTitle>Browse Accounts</CardTitle>
						<CardDescription>
							Use the list endpoint or narrow it with the bank filter endpoint.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-5">
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(createValidation.business_id)}>
								<FieldLabel htmlFor="bank-account-business">
									Business
								</FieldLabel>
								<Select
									value={businessId}
									onValueChange={(value) => {
										setBusinessId(value ?? "");
										setBankFilter(ALL_BANKS_VALUE);
										setSelectedAccountNumber("");
									}}
									disabled={businessesLoading}
								>
									<SelectTrigger
										id="bank-account-business"
										className="w-full"
										aria-invalid={Boolean(createValidation.business_id)}
									>
										<SelectValue placeholder="Select a business">
											{selectedBusiness?.name}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{businesses.map((business) => (
												<SelectItem key={business.id} value={business.id}>
													{business.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>

							<Field>
								<FieldLabel htmlFor="bank-account-filter">
									Bank Filter
								</FieldLabel>
								<Select
									value={bankFilter}
									onValueChange={(value) =>
										setBankFilter(
											(value as BankNameEnum | typeof ALL_BANKS_VALUE) ??
												ALL_BANKS_VALUE,
										)
									}
									disabled={!businessId}
								>
									<SelectTrigger id="bank-account-filter" className="w-full">
										<SelectValue placeholder="All banks">
											{bankFilter === ALL_BANKS_VALUE
												? "All banks"
												: getBankLabel(bankFilter)}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value={ALL_BANKS_VALUE}>All banks</SelectItem>
											{BANK_OPTIONS.map((bank) => (
												<SelectItem key={bank.value} value={bank.value}>
													{bank.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
						</FieldGroup>

						{accountsError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not load bank accounts</AlertTitle>
								<AlertDescription>
									{getErrorMessage(
										accountsError,
										"The API request failed for the current business selection.",
									)}
								</AlertDescription>
							</Alert>
						) : null}

						{!businessId ? (
							<Alert>
								<AlertTitle>Select a business</AlertTitle>
								<AlertDescription>
									Choose a business to load bank accounts from the API.
								</AlertDescription>
							</Alert>
						) : accountsLoading || accountsFetching ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2Icon className="animate-spin" />
								Loading bank accounts...
							</div>
						) : totalAccounts === 0 ? (
							<Alert>
								<AlertTitle>No bank accounts found</AlertTitle>
								<AlertDescription>
									No accounts matched the current business and bank filter.
								</AlertDescription>
							</Alert>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Bank</TableHead>
										<TableHead>Account Name</TableHead>
										<TableHead>Account Number</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{accounts.map((account) => {
										const isSelected =
											account.account_number === selectedAccountNumber;
										return (
											<TableRow
												key={account.account_number}
												data-state={isSelected ? "selected" : undefined}
												className="cursor-pointer"
												onClick={() =>
													setSelectedAccountNumber(account.account_number)
												}
											>
												<TableCell className="font-medium">
													{getBankLabel(account.bank_name)}
												</TableCell>
												<TableCell>{account.account_name}</TableCell>
												<TableCell className="font-mono">
													{account.account_number}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															account.is_archived ? "secondary" : "default"
														}
													>
														{account.is_archived ? "Archived" : "Active"}
													</Badge>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</section>

			<Dialog
				open={createDialogOpen}
				onOpenChange={(open) => {
					setCreateDialogOpen(open);
					if (!open) resetCreateForm();
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Bank Account</DialogTitle>
						<DialogDescription>
							This form maps directly to `POST /api/v1/bank-accounts`.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate} className="flex flex-col gap-4">
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(createValidation.business_id)}>
								<FieldLabel htmlFor="create-bank-business">Business</FieldLabel>
								<Select
									value={businessId}
									onValueChange={(value) => {
										setBusinessId(value ?? "");
										setCreateValidation((current) => ({
											...current,
											business_id: undefined,
										}));
									}}
								>
									<SelectTrigger
										id="create-bank-business"
										className="w-full"
										aria-invalid={Boolean(createValidation.business_id)}
									>
										<SelectValue placeholder="Select a business">
											{createBusinessName}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{businesses.map((business) => (
												<SelectItem key={business.id} value={business.id}>
													{business.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>{createValidation.business_id}</FieldError>
							</Field>

							<Field data-invalid={Boolean(createValidation.bank_name)}>
								<FieldLabel htmlFor="create-bank-name">Bank</FieldLabel>
								<Select
									value={createForm.bank_name}
									onValueChange={(value) => {
										setCreateForm((current) => ({
											...current,
											bank_name: (value as BankNameEnum | "") ?? "",
										}));
										setCreateValidation((current) => ({
											...current,
											bank_name: undefined,
										}));
									}}
								>
									<SelectTrigger
										id="create-bank-name"
										className="w-full"
										aria-invalid={Boolean(createValidation.bank_name)}
									>
										<SelectValue placeholder="Select a bank" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{BANK_OPTIONS.map((bank) => (
												<SelectItem key={bank.value} value={bank.value}>
													{bank.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>{createValidation.bank_name}</FieldError>
							</Field>

							<Field data-invalid={Boolean(createValidation.account_name)}>
								<FieldLabel htmlFor="create-account-name">
									Account Name
								</FieldLabel>
								<Input
									id="create-account-name"
									value={createForm.account_name}
									onChange={(event) => {
										setCreateForm((current) => ({
											...current,
											account_name: event.target.value,
										}));
										setCreateValidation((current) => ({
											...current,
											account_name: undefined,
										}));
									}}
									placeholder="Tina Verify Operations"
									autoComplete="off"
									aria-invalid={Boolean(createValidation.account_name)}
								/>
								<FieldError>{createValidation.account_name}</FieldError>
							</Field>

							<Field data-invalid={Boolean(createValidation.account_number)}>
								<FieldLabel htmlFor="create-account-number">
									Account Number
								</FieldLabel>
								<Input
									id="create-account-number"
									value={createForm.account_number}
									onChange={(event) => {
										setCreateForm((current) => ({
											...current,
											account_number: event.target.value,
										}));
										setCreateValidation((current) => ({
											...current,
											account_number: undefined,
										}));
									}}
									placeholder="1000123456789"
									autoComplete="off"
									aria-invalid={Boolean(createValidation.account_number)}
								/>
								<FieldError>{createValidation.account_number}</FieldError>
							</Field>
						</FieldGroup>

						{createError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not create bank account</AlertTitle>
								<AlertDescription>{createError}</AlertDescription>
							</Alert>
						) : null}

						<DialogFooter>
							<Button type="submit" disabled={creating}>
								{creating ? (
									<>
										<Loader2Icon
											data-icon="inline-start"
											className="animate-spin"
										/>
										Creating...
									</>
								) : (
									<>
										<PlusIcon data-icon="inline-start" />
										Create Account
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</main>
	);
}

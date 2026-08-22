"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import appIcon from "@/assets/images/app_icon.png";
import { LoginMeshBackground } from "@/components/login/login-mesh-bg";
import { BRAND_NAME } from "@/lib/brand";
import { useAuth } from "../../store/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";

export default function LoginPage() {
	const router = useRouter();
	const { login, loading: authLoading, error: authError, user } = useAuth();
	const [emailOrPhone, setEmailOrPhone] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");

	const uiError = error || authError || "";

	useEffect(() => {
		if (user) router.replace("/admin");
	}, [user, router]);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		const success = await login(emailOrPhone, password);

		if (success) {
			router.push("/admin");
			return;
		}

		if (authError) {
			setError(authError);
		}
	}

	return (
		<main className="relative flex min-h-svh flex-col overflow-hidden bg-[#faf8f4]">
			<LoginMeshBackground />

			<header className="relative z-10 flex items-center gap-2.5 px-6 py-5 sm:px-8">
				<Image
					src={appIcon}
					alt=""
					priority
					width={28}
					height={28}
					className="size-7 rounded-md"
				/>
				<span className="text-[15px] font-semibold tracking-tight text-foreground">
					{BRAND_NAME}
				</span>
			</header>

			<div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
				<div className="w-full max-w-100 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_15px_35px_rgba(23,23,23,0.08),0_5px_15px_rgba(0,0,0,0.04)]">
					<div className="px-6 py-8 sm:px-8">
						<h1 className="text-center text-[22px] font-semibold tracking-tight text-foreground">
							Sign in to your account
						</h1>

						{uiError ? (
							<Alert
								variant="destructive"
								className="mt-6"
								aria-live="polite"
							>
								<AlertTitle>Sign in failed</AlertTitle>
								<AlertDescription>
									<div className="flex flex-col gap-2">
										<div>{uiError}</div>
										{uiError.includes("confirm") ? (
											<p className="text-sm">
												Check your email inbox (and spam folder) for the
												confirmation link.
											</p>
										) : null}
									</div>
								</AlertDescription>
							</Alert>
						) : null}

						<form
							onSubmit={(e) => void handleLogin(e)}
							className="mt-7 flex flex-col gap-5"
						>
							<FieldGroup>
								<Field>
									<FieldLabel
										htmlFor="emailOrPhone"
										className="text-[13px] font-medium text-muted-foreground"
									>
										Email or phone
									</FieldLabel>
									<InputGroup className="rounded-md border-[#e3e8ee] shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-[#e3e8ee] has-[[data-slot=input-group-control]:focus-visible]:ring-0">
										<InputGroupInput
											id="emailOrPhone"
											name="username"
											type="text"
											inputMode="email"
											autoComplete="username"
											spellCheck={false}
											required
											placeholder="name@company.com or +251…"
											value={emailOrPhone}
											onChange={(e) => setEmailOrPhone(e.target.value)}
											className="h-10 bg-white shadow-none focus-visible:ring-0"
										/>
									</InputGroup>
								</Field>

								<Field>
									<FieldLabel
										htmlFor="password"
										className="text-[13px] font-medium text-muted-foreground"
									>
										Password
									</FieldLabel>
									<InputGroup className="rounded-md border-[#e3e8ee] shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-[#e3e8ee] has-[[data-slot=input-group-control]:focus-visible]:ring-0">
										<InputGroupInput
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											autoComplete="current-password"
											required
											placeholder="Your password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="h-10 bg-white shadow-none focus-visible:ring-0"
										/>
										<InputGroupAddon align="inline-end">
											<InputGroupButton
												type="button"
												size="icon-xs"
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
												aria-pressed={showPassword}
												onClick={() => setShowPassword((v) => !v)}
											>
												{showPassword ? (
													<EyeOffIcon aria-hidden />
												) : (
													<EyeIcon aria-hidden />
												)}
											</InputGroupButton>
										</InputGroupAddon>
									</InputGroup>
								</Field>
							</FieldGroup>

							<Button
								type="submit"
								className="h-10 w-full rounded-md text-[15px] font-medium"
								disabled={authLoading}
							>
								{authLoading ? (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								) : null}
								{authLoading ? "Signing in…" : "Sign in"}
							</Button>
						</form>
					</div>

					<div className="border-t border-border bg-muted/60 px-6 py-4 text-center text-[13px] text-muted-foreground sm:px-8">
						Need access? Contact your administrator.
					</div>
				</div>
			</div>

			<footer className="relative z-10 px-6 py-4 text-[12px] text-muted-foreground sm:px-8">
				© {new Date().getFullYear()} {BRAND_NAME}
			</footer>
		</main>
	);
}

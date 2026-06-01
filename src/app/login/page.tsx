"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "../../store/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
	const router = useRouter();
	const { login, loading: authLoading, error: authError } = useAuth();
	const [emailOrPhone, setEmailOrPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const uiError = error || authError || "";

	const handleLogin = async (e: React.FormEvent) => {
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
	};

	return (
		<div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10 sm:px-8">
			<div className="mb-8 flex max-w-md flex-col items-center gap-3 text-center">
				<BrandLogo />
			</div>

			<Card className="w-full max-w-md border-border/80 shadow-lg">
				<CardHeader className="pb-2">
					<CardTitle className="text-xl">Sign in</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					{uiError && (
						<Alert variant="destructive" aria-live="polite">
							<AlertTitle>Sign in failed</AlertTitle>
							<AlertDescription>
								<div className="flex flex-col gap-2">
									<div>{uiError}</div>
									{uiError.includes("confirm") && (
										<p className="text-sm">
											Check your email inbox (and spam folder) for the
											confirmation link.
										</p>
									)}
								</div>
							</AlertDescription>
						</Alert>
					)}

					<form onSubmit={handleLogin} className="flex flex-col gap-5">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="emailOrPhone">Email or phone</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="emailOrPhone"
										name="username"
										type="text"
										inputMode="email"
										autoComplete="username"
										spellCheck={false}
										required
										placeholder="name@company.com or +251911234567"
										value={emailOrPhone}
										onChange={(e) => setEmailOrPhone(e.target.value)}
									/>
								</InputGroup>
							</Field>

							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
										placeholder="Enter your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</InputGroup>
							</Field>
						</FieldGroup>

						<Button type="submit" size="lg" disabled={authLoading}>
							{authLoading && (
								<Loader2Icon
									data-icon="inline-start"
									className="animate-spin"
									aria-hidden
								/>
							)}
							{authLoading ? "Signing in…" : "Sign in"}
						</Button>
					</form>

					<Separator />

					<p className="text-center text-sm text-muted-foreground">
						Need access? Contact your administrator.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

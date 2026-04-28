"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, LogInIcon } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

export default function LoginPage() {
	const router = useRouter();
	const { login, loading: authLoading, error: authError } = useAuth();
	const [emailOrPhone, setEmailOrPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const uiError = error || authError || "";

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(authError || "");

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
		<div className="grid min-h-svh grid-cols-1 bg-background lg:grid-cols-2">
			<div className="hidden bg-muted lg:block" aria-hidden="true" />

			<div className="flex items-center justify-center px-4 py-10">
				<div className="w-full max-w-md">
					<div className="mb-6 text-center">
						<Link href="/" className="inline-flex items-center justify-center">
							<span className="text-pretty text-2xl font-semibold">
								Zuludine
							</span>
						</Link>
						<p className="mt-2 text-sm text-muted-foreground">
							Sign in to access your dashboard.
						</p>
					</div>

					<Card>
						<CardHeader className="flex flex-col items-center gap-2">
							<CardTitle className="flex items-center gap-2">
								Welcome to Zuludine
							</CardTitle>
							<CardDescription>
								Your all in one solution for your business.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							{uiError && (
								<Alert variant="destructive" aria-live="polite">
									<AlertTitle>Login Failed</AlertTitle>
									<AlertDescription>
										<div className="flex flex-col gap-2">
											<div>{uiError}</div>
											{uiError.includes("confirm") && (
												<div className="text-sm">
													Check your email inbox (and spam folder) for the
													confirmation link.
												</div>
											)}
										</div>
									</AlertDescription>
								</Alert>
							)}

							<form onSubmit={handleLogin} className="flex flex-col gap-5">
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="emailOrPhone">
											Email or Phone
										</FieldLabel>
										<InputGroup>
											<InputGroupInput
												id="emailOrPhone"
												name="username"
												type="text"
												inputMode="email"
												autoComplete="username"
												spellCheck={false}
												required
												placeholder="name@company.com or +251911234567…"
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
												placeholder="Enter your password…"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
											/>
										</InputGroup>
									</Field>
								</FieldGroup>

								<Button type="submit" disabled={authLoading}>
									{authLoading && (
										<Loader2Icon
											data-icon="inline-start"
											className="animate-spin"
											aria-hidden="true"
										/>
									)}
									{authLoading ? "Signing in…" : "Sign In"}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

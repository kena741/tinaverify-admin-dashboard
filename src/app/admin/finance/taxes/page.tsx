"use client";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinanceTaxesPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Taxes"
				description="Configure tax rules and rates for the platform."
			/>

			<Card>
				<CardHeader>
					<CardTitle>Tax configuration</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Tax settings will appear here when connected to the backend.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

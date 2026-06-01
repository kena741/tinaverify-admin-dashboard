import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactMessagesPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Contact Messages"
				description="View and respond to messages submitted through the contact form."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Inbox</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Contact messages will appear here when connected to the backend.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ServicePlaceholderPageProps = {
	title: string;
	description: string;
};

export function ServicePlaceholderPage({
	title,
	description,
}: ServicePlaceholderPageProps) {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title={title} description={description} />
			<Card>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Content for {title.toLowerCase()} will appear here when connected to
						the backend.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

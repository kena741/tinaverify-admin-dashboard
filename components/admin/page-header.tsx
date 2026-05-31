type PageHeaderProps = {
	title: string;
	description?: string;
	actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				{description && (
					<p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
				)}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</div>
	);
}

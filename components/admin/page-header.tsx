type PageHeaderProps = {
	title: string;
	description?: string;
	actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex min-w-0 flex-col gap-1.5">
				<h1 className="admin-page-title">{title}</h1>
				{description ? (
					<p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</div>
	);
}

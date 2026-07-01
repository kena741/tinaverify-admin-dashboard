type SectionHeadingProps = {
	title: string;
	description?: string;
};

export function SectionHeading({ title, description }: SectionHeadingProps) {
	return (
		<div className="flex flex-col gap-1">
			<h2 className="admin-section-title">{title}</h2>
			{description ? (
				<p className="text-sm text-muted-foreground">{description}</p>
			) : null}
		</div>
	);
}

"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import BusinessDetailClient from "./BusinessDetailClient";

export default function BusinessDetailPage() {
	const params = useParams<{ id?: string }>();
	return (
		<Suspense fallback={null}>
			<BusinessDetailClient params={{ id: params.id ?? "" }} />
		</Suspense>
	);
}

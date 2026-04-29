"use client";

import { useParams } from "next/navigation";
import BusinessDetailClient from "./BusinessDetailClient";

export default function BusinessDetailPage() {
	const params = useParams<{ id?: string }>();
	return <BusinessDetailClient params={{ id: params.id ?? "" }} />;
}

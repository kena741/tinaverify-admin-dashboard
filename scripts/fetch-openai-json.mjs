#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const urls = {
	staging: "https://staging.api.tinaverify.com/openapi.json",
	production: "https://api.tinaverify.com/openapi.json",
};

function usage() {
	console.error("Usage: npm run fetch-openapi -- [staging|production]");
}

async function main() {
	if (process.argv.length > 3) {
		usage();
		process.exitCode = 2;
		return;
	}

	const environment = process.argv[2] ?? "staging";
	const url = urls[environment];
	if (!url) {
		usage();
		process.exitCode = 2;
		return;
	}

	const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
	const destination = path.resolve(
		scriptDirectory,
		"../src/services/openapi.json",
	);
	const temporaryFile = `${destination}.${randomUUID()}.tmp`;

	console.log(`Fetching ${environment} OpenAPI specification...`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Could not fetch OpenAPI specification: ${response.status} ${response.statusText}`,
		);
	}

	const content = await response.text();
	let specification;
	try {
		specification = JSON.parse(content);
	} catch (error) {
		throw new Error("Downloaded OpenAPI specification is not valid JSON.", {
			cause: error,
		});
	}

	if (
		!specification ||
		typeof specification !== "object" ||
		(!specification.openapi && !specification.swagger) ||
		!specification.paths ||
		typeof specification.paths !== "object" ||
		Array.isArray(specification.paths)
	) {
		throw new Error(
			"Downloaded JSON is not a valid OpenAPI document.",
		);
	}

	try {
		await writeFile(temporaryFile, content, { encoding: "utf8", mode: 0o644 });
		await rename(temporaryFile, destination);
	} finally {
		await rm(temporaryFile, { force: true });
	}

	console.log(`Updated ${destination}`);
}

main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});

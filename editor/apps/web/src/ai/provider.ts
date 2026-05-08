import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";

export type ProviderId = "anthropic" | "google" | "openai" | "ollama";

export interface ResolvedProvider {
	id: ProviderId;
	model: LanguageModel;
	displayName: string;
}

export class ProviderConfigError extends Error {
	public readonly provider: ProviderId;
	constructor({
		message,
		provider,
	}: {
		message: string;
		provider: ProviderId;
	}) {
		super(message);
		this.name = "ProviderConfigError";
		this.provider = provider;
	}
}

const MODEL_LIST_URLS: Record<ProviderId, string> = {
	anthropic: "https://docs.anthropic.com/en/docs/about-claude/models",
	google: "https://ai.google.dev/gemini-api/docs/models",
	openai: "https://platform.openai.com/docs/models",
	ollama: "https://ollama.com/library",
};

function readProviderId(): ProviderId {
	const raw = process.env.AIVC_AI_PROVIDER?.toLowerCase().trim();
	if (
		raw === "anthropic" ||
		raw === "google" ||
		raw === "openai" ||
		raw === "ollama"
	) {
		return raw;
	}
	return "anthropic";
}

function requireModel({
	value,
	envVar,
	provider,
}: {
	value: string | undefined;
	envVar: string;
	provider: ProviderId;
}): string {
	const trimmed = value?.trim();
	if (!trimmed) {
		throw new ProviderConfigError({
			message: `${envVar} nicht gesetzt. Wähle ein aktuelles Modell von ${MODEL_LIST_URLS[provider]} und trage es in editor/apps/web/.env.local ein.`,
			provider,
		});
	}
	return trimmed;
}

function requireKey({
	value,
	envVar,
	provider,
	consoleUrl,
}: {
	value: string | undefined;
	envVar: string;
	provider: ProviderId;
	consoleUrl: string;
}): void {
	if (!value) {
		throw new ProviderConfigError({
			message: `Bitte ${envVar} in editor/apps/web/.env.local setzen. API-Key holen unter: ${consoleUrl}`,
			provider,
		});
	}
}

export function resolveProvider(): ResolvedProvider {
	const id = readProviderId();

	switch (id) {
		case "anthropic": {
			requireKey({
				value: process.env.ANTHROPIC_API_KEY,
				envVar: "ANTHROPIC_API_KEY",
				provider: id,
				consoleUrl: "https://console.anthropic.com/settings/keys",
			});
			const modelName = requireModel({
				value: process.env.ANTHROPIC_MODEL,
				envVar: "ANTHROPIC_MODEL",
				provider: id,
			});
			return {
				id,
				model: anthropic(modelName),
				displayName: `Anthropic · ${modelName}`,
			};
		}
		case "google": {
			requireKey({
				value: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
				envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
				provider: id,
				consoleUrl: "https://aistudio.google.com/app/apikey",
			});
			const modelName = requireModel({
				value: process.env.GEMINI_MODEL,
				envVar: "GEMINI_MODEL",
				provider: id,
			});
			return {
				id,
				model: google(modelName),
				displayName: `Google · ${modelName}`,
			};
		}
		case "openai": {
			requireKey({
				value: process.env.OPENAI_API_KEY,
				envVar: "OPENAI_API_KEY",
				provider: id,
				consoleUrl: "https://platform.openai.com/api-keys",
			});
			const modelName = requireModel({
				value: process.env.OPENAI_MODEL,
				envVar: "OPENAI_MODEL",
				provider: id,
			});
			return {
				id,
				model: openai(modelName),
				displayName: `OpenAI · ${modelName}`,
			};
		}
		case "ollama": {
			const baseURL =
				process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434/api";
			const modelName = requireModel({
				value: process.env.OLLAMA_MODEL,
				envVar: "OLLAMA_MODEL",
				provider: id,
			});
			const ollama = createOllama({ baseURL });
			return {
				id,
				model: ollama(modelName),
				displayName: `Ollama · ${modelName}`,
			};
		}
	}
}

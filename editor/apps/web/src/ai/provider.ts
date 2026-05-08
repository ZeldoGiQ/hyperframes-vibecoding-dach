import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";

export type ProviderId = "anthropic" | "openai" | "ollama";

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

const DEFAULT_MODELS: Record<ProviderId, string> = {
	anthropic: "claude-sonnet-4-5",
	openai: "gpt-4o-mini",
	ollama: "llama3.2",
};

function readProviderId(): ProviderId {
	const raw = process.env.AIVC_AI_PROVIDER?.toLowerCase().trim();
	if (raw === "anthropic" || raw === "openai" || raw === "ollama") {
		return raw;
	}
	return "anthropic";
}

export function resolveProvider(): ResolvedProvider {
	const id = readProviderId();
	const modelOverride = process.env.AIVC_AI_MODEL?.trim();
	const modelName = modelOverride || DEFAULT_MODELS[id];

	switch (id) {
		case "anthropic": {
			if (!process.env.ANTHROPIC_API_KEY) {
				throw new ProviderConfigError({
					message:
						"Bitte ANTHROPIC_API_KEY in editor/apps/web/.env.local setzen. API-Key holen unter: https://console.anthropic.com/settings/keys",
					provider: "anthropic",
				});
			}
			return {
				id,
				model: anthropic(modelName),
				displayName: `Anthropic · ${modelName}`,
			};
		}
		case "openai": {
			if (!process.env.OPENAI_API_KEY) {
				throw new ProviderConfigError({
					message:
						"Bitte OPENAI_API_KEY in editor/apps/web/.env.local setzen. API-Key holen unter: https://platform.openai.com/api-keys",
					provider: "openai",
				});
			}
			return {
				id,
				model: openai(modelName),
				displayName: `OpenAI · ${modelName}`,
			};
		}
		case "ollama": {
			const baseURL =
				process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434/api";
			const ollama = createOllama({ baseURL });
			return {
				id,
				model: ollama(modelName),
				displayName: `Ollama · ${modelName}`,
			};
		}
	}
}

/**
 * Shared TypeScript types for AIVC DACH brand configuration.
 * Used by editor (web app), generator (renderer) and mcp-server.
 *
 * Source-of-truth schema lives in `shared/brand.config.example.json`.
 */

export type Hex = `#${string}`;
export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type LanguageCode = "auto" | "en" | "de" | "es" | "fr" | "it" | "nl" | "pt" | (string & {});

export interface BrandConfigBrand {
	name: string;
	primaryColor: Hex;
	accentColor: Hex;
	backgroundColor: Hex;
	textColor: Hex;
	fontHeading: string;
	fontBody: string;
	fontMono: string;
	logoPath: string | null;
	logoPosition: LogoPosition;
}

export interface BrandConfigPreferences {
	language: LanguageCode;
	subtitlesEnabled: boolean;
	subtitlesLanguage: LanguageCode;
	defaultAspectRatio: "16:9" | "9:16" | "1:1" | "4:5" | "4:3";
	outputDirectory: string;
}

export interface BrandConfig {
	version: string;
	brand: BrandConfigBrand;
	preferences: BrandConfigPreferences;
	setupComplete?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

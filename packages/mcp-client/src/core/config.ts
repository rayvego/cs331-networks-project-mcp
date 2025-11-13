/**
 * Configuration management for MCP client
 */

interface ServerConfig {
	command: string;
	args: string[];
	env?: Record<string, string>;
}

interface ServersConfig {
	mcpServers: Record<string, ServerConfig>;
}

export type LLMProvider = "gemini" | "groq";

export class Configuration {
	private geminiApiKeys: string[] = [];
	private groqApiKeys: string[] = [];
	private currentGeminiKeyIndex: number = 0;
	private currentGroqKeyIndex: number = 0;

	/**
	 * Initializes the configuration manager.
	 *
	 * Loads environment variables and API keys from the system environment.
	 * Automatically discovers and configures multiple API keys for load balancing.
	 */
	constructor() {
		this.loadEnv();
		this.loadApiKeys();
	}

	/**
	 * Loads environment variables from the system.
	 *
	 * Uses Bun's automatic .env file loading mechanism to populate
	 * the process environment with configuration values.
	 *
	 * @private
	 */
	private loadEnv(): void {
		// Bun automatically loads .env files
	}

	/**
	 * Discovers and loads API keys from environment variables for both providers.
	 *
	 * Searches for numbered API keys for both Gemini (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
	 * and Groq (GROQ_API_KEY_1, GROQ_API_KEY_2, etc.) and falls back to the original
	 * API keys if no numbered keys are found. This enables API key rotation for
	 * load balancing and rate limit management.
	 *
	 * @private
	 */
	private loadApiKeys(): void {
		// Load Gemini API keys
		this.loadProviderApiKeys("gemini", "GEMINI_API_KEY", this.geminiApiKeys);

		// Load Groq API keys
		this.loadProviderApiKeys("groq", "GROQ_API_KEY", this.groqApiKeys);
	}

	/**
	 * Loads API keys for a specific provider.
	 *
	 * @param provider - The provider name for logging
	 * @param envPrefix - The environment variable prefix
	 * @param keyArray - The array to store the keys
	 * @private
	 */
	private loadProviderApiKeys(provider: string, envPrefix: string, keyArray: string[]): void {
		// Load all numbered keys (e.g., GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
		let keyIndex = 1;
		while (true) {
			const keyName = `${envPrefix}${keyIndex === 1 ? "" : `_${keyIndex}`}`;
			const keyValue = process.env[keyName];

			if (!keyValue) {
				// If we didn't find the current numbered key, stop looking
				break;
			}

			keyArray.push(keyValue);
			keyIndex++;
		}

		// If no numbered keys found, fall back to the original API key
		if (keyArray.length === 0) {
			const fallbackKey = process.env[envPrefix];
			if (fallbackKey) {
				keyArray.push(fallbackKey);
			}
		}

		if (keyArray.length === 0) {
			console.warn(`Warning: No ${envPrefix} environment variables found`);
		} else {
			console.log(`✓ Loaded ${keyArray.length} ${provider} API key(s) for rotation`);
		}
	}

	/**
	 * Loads MCP server configuration from a JSON file.
	 *
	 * Reads and parses the server configuration file that defines available
	 * MCP servers, their commands, arguments, and environment variables.
	 *
	 * @param filePath - Path to the JSON configuration file
	 * @returns Promise resolving to parsed server configuration
	 * @throws Error if file cannot be read or parsed
	 */
	static async loadConfig(filePath: string): Promise<ServersConfig> {
		try {
			const file = Bun.file(filePath);
			return (await file.json()) as ServersConfig;
		} catch (error) {
			throw new Error(
				`Failed to load configuration from ${filePath}: ${error}`,
			);
		}
	}

	/**
	 * Gets the current LLM provider from environment variable.
	 *
	 * Defaults to "gemini" if not specified. Supports "gemini" and "groq".
	 *
	 * @returns The configured LLM provider
	 */
	get llmProvider(): LLMProvider {
		const provider = process.env.LLM_PROVIDER?.toLowerCase();
		return provider === "groq" ? "groq" : "gemini";
	}

	/**
	 * Gets the next API key in rotation for the current provider.
	 *
	 * Returns API keys in round-robin fashion to distribute load across
	 * multiple keys and avoid rate limiting. Automatically rotates to the
	 * next available key on each access.
	 *
	 * @returns The next API key in the rotation
	 * @throws Error if no API keys are configured for the current provider
	 */
	get llmApiKey(): string {
		const provider = this.llmProvider;
		const keyArray = provider === "groq" ? this.groqApiKeys : this.geminiApiKeys;
		const currentIndex = provider === "groq" ? this.currentGroqKeyIndex : this.currentGeminiKeyIndex;

		if (keyArray.length === 0) {
			throw new Error(`No ${provider.toUpperCase()}_API_KEY environment variables found`);
		}

		// Get the next key in rotation
		const key = keyArray[currentIndex];

		if (!key) {
			throw new Error("Invalid API key state - key is undefined");
		}

		// Move to the next key for future requests
		if (provider === "groq") {
			this.currentGroqKeyIndex = (this.currentGroqKeyIndex + 1) % keyArray.length;
		} else {
			this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % keyArray.length;
		}

		return key;
	}

	/**
	 * Gets the total number of configured API keys for the current provider.
	 *
	 * @returns The number of API keys available for rotation
	 */
	get totalKeys(): number {
		const provider = this.llmProvider;
		const keyArray = provider === "groq" ? this.groqApiKeys : this.geminiApiKeys;
		return keyArray.length;
	}
}

export type { ServerConfig, ServersConfig };

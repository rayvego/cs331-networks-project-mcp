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

export class Configuration {
	private apiKeys: string[] = [];
	private currentKeyIndex: number = 0;

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
	 * Discovers and loads Gemini API keys from environment variables.
	 *
	 * Searches for numbered API keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
	 * and falls back to the original GEMINI_API_KEY if no numbered keys are found.
	 * This enables API key rotation for load balancing and rate limit management.
	 *
	 * @private
	 */
	private loadApiKeys(): void {
		// Load all GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
		let keyIndex = 1;
		while (true) {
			const keyName = `GEMINI_API_KEY${keyIndex === 1 ? "" : `_${keyIndex}`}`;
			const keyValue = process.env[keyName];

			if (!keyValue) {
				// If we didn't find the current numbered key, stop looking
				break;
			}

			this.apiKeys.push(keyValue);
			keyIndex++;
		}

		// If no numbered keys found, fall back to the original GEMINI_API_KEY
		if (this.apiKeys.length === 0) {
			const fallbackKey = process.env.GEMINI_API_KEY;
			if (fallbackKey) {
				this.apiKeys.push(fallbackKey);
			}
		}

		if (this.apiKeys.length === 0) {
			console.warn("Warning: No GEMINI_API_KEY environment variables found");
		} else {
			console.log(`✓ Loaded ${this.apiKeys.length} API key(s) for rotation`);
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
	 * Gets the next API key in rotation for load balancing.
	 *
	 * Returns API keys in round-robin fashion to distribute load across
	 * multiple keys and avoid rate limiting. Automatically rotates to the
	 * next available key on each access.
	 *
	 * @returns The next API key in the rotation
	 * @throws Error if no API keys are configured
	 */
	get llmApiKey(): string {
		if (this.apiKeys.length === 0) {
			throw new Error("No GEMINI_API_KEY environment variables found");
		}

		// Get the next key in rotation
		const key = this.apiKeys[this.currentKeyIndex];

		if (!key) {
			throw new Error("Invalid API key state - key is undefined");
		}

		// Move to the next key for future requests
		this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

		return key;
	}

	/**
	 * Gets the total number of configured API keys.
	 *
	 * @returns The number of API keys available for rotation
	 */
	get totalKeys(): number {
		return this.apiKeys.length;
	}
}

export type { ServerConfig, ServersConfig };

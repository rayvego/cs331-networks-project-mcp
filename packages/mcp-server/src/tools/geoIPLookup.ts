import * as z from "zod";

export const geoIPLookupTool = {
	name: "network-geoiplookup",
	definition: {
		title: "GeoIP Lookup Tool",
		description:
			"Fetches geographic location information for an IP address using the geoiplookup.io API",
		inputSchema: {
			ip: z
				.string()
				.describe(
					"The IP address to look up geographic information for (required)",
				),
		},
	},
	/**
	 * Fetches geolocation and ownership data for an IP address.
	 *
	 * Queries the geoiplookup.io API to retrieve geographic location information,
	 * ISP details, and ownership data for the specified IP address. Requires
	 * user approval via elicitation before making the external API call.
	 *
	 * @param params - Tool parameters
	 * @param params.ip - The IP address to look up geographic information for
	 * @param elicitationRequest - Function to request user approval for API call
	 * @returns Promise resolving to geolocation data including city, country, ISP
	 * @throws Error if user declines approval, API call fails, or IP is invalid
	 */
	handler: async (
		{ ip }: Record<string, unknown>,
		elicitationRequest: (
			message: string,
			schema: object,
		) => Promise<{ action: "accept" | "decline" | "cancel"; content?: { approved?: boolean } }>,
	) => {
		// Request user approval via elicitation
		const confirmationMessage = `Allow network-diagnostics to look up IP ${ip} using geoiplookup.io?`;
		const requestedSchema = {
			type: "object",
			properties: {
				approved: {
					type: "boolean",
					title: "Approve lookup",
					description: "Confirm to allow the IP geolocation lookup",
				},
			},
			required: ["approved"],
		};

		try {
			const elicitationResponse = await elicitationRequest(
				confirmationMessage,
				requestedSchema,
			);

			// Check if user approved
			if (
				elicitationResponse.action === "accept" &&
				elicitationResponse.content?.approved === true
			) {
				// User approved - proceed with API call
				try {
					const response = await fetch(`https://json.geoiplookup.io/${ip}`);

					if (response.ok) {
						const data = await response.json();
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(data, null, 2),
								},
							],
						};
					} else {
						return {
							content: [
								{
									type: "text",
									text: `API request failed with status ${response.status}: ${response.statusText}`,
								},
							],
							isError: true,
						};
					}
				} catch (fetchError) {
					return {
						content: [
							{
								type: "text",
								text: `Failed to fetch geolocation data: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
							},
						],
						isError: true,
					};
				}
			} else {
				// User declined or canceled - return denial message
				return {
					content: [
						{
							type: "text",
							text: "Request denied by user. IP geolocation lookup was not approved.",
						},
					],
					isError: false,
				};
			}
		} catch (error) {
			// Handle elicitation request errors
			return {
				content: [
					{
						type: "text",
						text: `Failed to request user approval: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
				isError: true,
			};
		}
	},
};


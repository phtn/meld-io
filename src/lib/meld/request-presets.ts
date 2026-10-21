export const REQUEST_VALUE_PRESETS = [
  { id: "us", label: "US", countryCode: "US", currencyCode: "USD", assetCode: "BTC", firstName: "Amara", lastName: "Brooks" },
  { id: "gb", label: "GB", countryCode: "GB", currencyCode: "GBP", assetCode: "ETH", firstName: "Oliver", lastName: "Bennett" },
  { id: "jp", label: "JP", countryCode: "JP", currencyCode: "JPY", assetCode: "USDC", firstName: "Akiko", lastName: "Tanaka" },
  { id: "ph", label: "PH", countryCode: "PH", currencyCode: "PHP", assetCode: "BTC", firstName: "Sofia", lastName: "Santos" },
] as const;

export const WALLET_ADDRESS_ASSETS = ["BTC", "ETH", "USDC", "USDT", "POL"] as const;
export type WalletAddressAsset = typeof WALLET_ADDRESS_ASSETS[number];
export type WalletAddressSettings = Record<WalletAddressAsset, string>;

export function createEmptyWalletAddressSettings(): WalletAddressSettings {
  return { BTC: "", ETH: "", USDC: "", USDT: "", POL: "" };
}

export function parseWalletAddressSettings(value: string | null): WalletAddressSettings {
  const addresses = createEmptyWalletAddressSettings();
  if (!value) return addresses;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return addresses;
    WALLET_ADDRESS_ASSETS.forEach((asset) => {
      const address = (parsed as Record<string, unknown>)[asset];
      if (typeof address === "string") addresses[asset] = address;
    });
  } catch {
    // Ignore older single-field settings values that do not match the asset map.
  }
  return addresses;
}

export function getConfiguredWalletAddresses(settings: WalletAddressSettings): string[] {
  return WALLET_ADDRESS_ASSETS.map((asset) => settings[asset].trim()).filter(Boolean);
}

export function getWalletAddressForAsset(settings: WalletAddressSettings, asset: string): string {
  const normalizedAsset = asset.toUpperCase();
  return WALLET_ADDRESS_ASSETS.includes(normalizedAsset as WalletAddressAsset)
    ? settings[normalizedAsset as WalletAddressAsset].trim()
    : "";
}

export function isWalletAddressFieldName(name: string): boolean {
  const normalizedName = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalizedName.includes("wallet") && normalizedName.includes("address");
}

export function getRequestValuePreset(index: number) {
  return REQUEST_VALUE_PRESETS[index] ?? REQUEST_VALUE_PRESETS[0];
}

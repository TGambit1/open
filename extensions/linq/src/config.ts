import type { LinqAccountConfig, LinqProtocol } from "./types.js";

export type ResolvedLinqAccount = {
  apiToken: string;
  webhookSecret: string;
  fromNumber: string;
  groupChatId?: string;
  defaultProtocol: LinqProtocol;
  dmPolicy: "open" | "paired";
  configured: boolean;
};

/**
 * Resolve Linq account config from env + explicit config, with sane defaults.
 * Env vars take precedence over config file values so secrets stay out of files.
 */
export function resolveLinqAccount(cfg?: LinqAccountConfig): ResolvedLinqAccount {
  const apiToken =
    process.env["LINQ_API_TOKEN"] ?? cfg?.apiToken ?? "";
  const webhookSecret =
    process.env["LINQ_WEBHOOK_SECRET"] ?? cfg?.webhookSecret ?? "";
  const fromNumber =
    process.env["LINQ_FROM_NUMBER"] ?? cfg?.fromNumber ?? "";

  const configured = Boolean(apiToken && fromNumber);

  return {
    apiToken,
    webhookSecret,
    fromNumber,
    groupChatId: cfg?.groupChatId,
    defaultProtocol: cfg?.defaultProtocol ?? "imessage",
    dmPolicy: cfg?.dmPolicy ?? "paired",
    configured,
  };
}

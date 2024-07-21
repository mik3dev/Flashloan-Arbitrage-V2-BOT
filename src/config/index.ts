import { z } from "zod";
import { isEthereumAddress } from "validator";
import isBoolean from "validator/lib/isBoolean";

const envVars = z.object({
  WEBSOCKET_PROVIDER_URL: z.string().url(),
  FLASHBOT_V2_ADDRESS: z.string().refine((val) => isEthereumAddress(val)),
  PRIVATE_KEY: z.string(),
  IS_TRADE_ACTIVE: z.string().refine((val) => isBoolean(val)),
  CHAIN: z
    .string()
    .refine((val) =>
      [
        "ETHEREUM",
        "POLYGON",
        "BSC",
        "ARBITRUM",
        "OPTIMISM",
        "FANTOM",
        "AVALANCHE",
        "HARMONY",
        "MOONBEAM",
        "CELO",
        "MOONRIVER",
      ].includes(val)
    ),
});

envVars.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVars> {}
  }
}

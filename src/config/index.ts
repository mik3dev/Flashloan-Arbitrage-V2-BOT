import { z } from "zod";
import { isBoolean, isEthereumAddress, isNumeric } from "validator";

const envVars = z.object({
  WEBSOCKET_PROVIDER_URL: z.string().url(),
  FLASHBOT_V2_ADDRESS: z.string().refine((val) => isEthereumAddress(val)),
  PRIVATE_KEY: z.string(),
});

envVars.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envVars> {}
  }
}

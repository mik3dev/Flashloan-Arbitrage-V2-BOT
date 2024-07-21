import "dotenv/config";
import "./config";
import { FlashSwapUniswapV2Bot } from "./classes";
import config from "../config.json";

const privateKey = process.env.PRIVATE_KEY;
const wsProviderURL = process.env.WEBSOCKET_PROVIDER_URL;
const flashbotsV2Address = process.env.FLASHBOT_V2_ADDRESS;

const main = async () => {
  const bot = new FlashSwapUniswapV2Bot(
    privateKey,
    wsProviderURL,
    flashbotsV2Address
  );
  await bot.initialize(config);
  const forwardPathResults = await bot.calculateForwardPath();
  const backwardPathResults = await bot.calculateBackwardPath();
  console.log({ forwardPathResults, backwardPathResults });
};

main();

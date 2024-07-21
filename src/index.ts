import "dotenv/config";
import "./config";
import { Bot } from "./classes";
import config from "../config.json";

const privateKey = process.env.PRIVATE_KEY;
const wsProviderURL = process.env.WEBSOCKET_PROVIDER_URL;
const flashbotsV2Address = process.env.FLASHBOT_V2_ADDRESS;

const main = async () => {
  const bot = new Bot(privateKey, wsProviderURL, flashbotsV2Address);
  await bot.initialize(config);
};

main();

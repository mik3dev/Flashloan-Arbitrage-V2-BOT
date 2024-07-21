import "dotenv/config";
import "./config";

const privateKey = process.env.PRIVATE_KEY;
const wsProviderURL = process.env.WEBSOCKET_PROVIDER_URL;
const flashbotsV2Address = process.env.FLASHBOT_V2_ADDRESS;

import { FlashSwapUniswapV2 } from "./classes";
import Big from "big.js";
import { parseUnits } from "ethers";

const flashSwapUniswapV2 = new FlashSwapUniswapV2(
  flashbotsV2Address,
  privateKey,
  wsProviderURL
);

flashSwapUniswapV2.startListening();

const main = async () => {
  const amount = new Big(parseUnits("10000", 6).toString()).toString();
  const tokens = [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  ];
  const routers = [
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "0xEfF92A263d31888d860bD50809A8D171709b7b1c",
  ];
  const tx = await flashSwapUniswapV2.requestFlashTrade(
    amount,
    tokens,
    routers
  );
  console.log(tx);
};

main();

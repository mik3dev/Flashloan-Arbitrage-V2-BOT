import "dotenv/config";
import "./config";
import { FlashSwapUniswapV2Bot } from "./classes";
import config from "../config.json";
import { Contract } from "ethers";
import {
  getDexName,
  getTokenName,
  printInitialMessage,
  printSwapEvent,
} from "./helpers";

const privateKey = process.env.PRIVATE_KEY;
const wsProviderURL = process.env.WEBSOCKET_PROVIDER_URL;
const flashbotsV2Address = process.env.FLASHBOT_V2_ADDRESS;
const isTradeActive = process.env.IS_TRADE_ACTIVE;

const main = async () => {
  printInitialMessage();
  const flashSwapUniswapV2Bot = new FlashSwapUniswapV2Bot(
    privateKey,
    wsProviderURL,
    flashbotsV2Address
  );
  await flashSwapUniswapV2Bot.initialize(config);
  const pairsContracts = flashSwapUniswapV2Bot.getPairContracts() as Contract[];
  let isExecuting = false;

  for (const pairContract of pairsContracts) {
    const token0 = getTokenName(await pairContract.token0());
    const token1 = getTokenName(await pairContract.token1());
    const dexName = getDexName(await pairContract.getAddress());

    pairContract.on(
      "Swap",
      async (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
        if (isExecuting) return;
        isExecuting = true;

        console.log();
        console.log("\x1b[42mNew swap event detected! \x1b[0m");
        console.log("Checking for trade opportunities...");
        console.log();

        printSwapEvent({
          name: dexName,
          pairAdress: await pairContract.getAddress(),
          token0: token0,
          token1: token1,
          sender,
          amount0In,
          amount1In,
          amount0Out,
          amount1Out,
          to,
        });

        const forwardEstimation =
          await flashSwapUniswapV2Bot.calculateForwardPath();
        const backwardEstimation =
          await flashSwapUniswapV2Bot.calculateBackwardPath();

        const bestPath = flashSwapUniswapV2Bot.choosePath(
          forwardEstimation.amountDiff,
          backwardEstimation.amountDiff
        );

        const {
          ethBalance: ethBalanceBefore,
          tokenBalance: tokenBalanceBefore,
        } = await flashSwapUniswapV2Bot.getBalances();

        console.log();
        if (bestPath === "forward") {
          console.log("Forward path is profitable!");
          if (isTradeActive === "true") {
            const tx = await flashSwapUniswapV2Bot.executeForwardPath();
            if (!tx) console.log("\x1b[41Trade reverted!\x1b[0m");
          } else {
            console.log("\x1b[41mTrade not active!\x1b[0m");
          }
        } else if (bestPath === "backward") {
          console.log("Backward path is profitable!");
          if (isTradeActive === "true") {
            const tx = await flashSwapUniswapV2Bot.executeBackwardPath();
            if (!tx) console.log("\x1b[41Trade reverted!\x1b[0m");
          } else {
            console.log("\x1b[41mTrade not active!\x1b[0m");
          }
        } else {
          console.log();
          console.log("\x1b[41mNo profitable opportunity found!\x1b[0m");
          console.log();
        }

        const { ethBalance: ethBalanceAfter, tokenBalance: tokenBalanceAfter } =
          await flashSwapUniswapV2Bot.getBalances();

        flashSwapUniswapV2Bot.logProfitReport({
          ethBalanceBefore: ethBalanceBefore.toString(),
          ethBalanceAfter: ethBalanceAfter.toString(),
          tokenBalanceAfter,
          tokenBalanceBefore,
        });

        console.log("---");
        isExecuting = false;
      }
    );
  }
};

main();

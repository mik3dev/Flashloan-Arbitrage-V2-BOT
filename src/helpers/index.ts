import { formatUnits } from "ethers";
import configuration from "../../config.json";
import { Token } from "../types";
import TelegramBot from "node-telegram-bot-api";

export const printInitialMessage = () => {
  console.log(`
  \x1b[33m


    d8888         888      d8b 888                                             888888b.    .d88888b.  88888888888 
    d88888         888      Y8P 888                                             888  "88b  d88P" "Y88b     888     
   d88P888         888          888                                             888  .88P  888     888     888     
  d88P 888 888d888 88888b.  888 888888 888d888  8888b.   .d88b.   .d88b.        8888888K.  888     888     888     
  d88P  888 888P"   888 "88b 888 888    888P"       "88b d88P"88b d8P  Y8b       888  "Y88b 888     888     888     
  d88P   888 888     888  888 888 888    888     .d888888 888  888 88888888       888    888 888     888     888     
  d8888888888 888     888 d88P 888 Y88b.  888     888  888 Y88b 888 Y8b.           888   d88P Y88b. .d88P     888     
  d88P     888 888     88888P"  888  "Y888 888     "Y888888  "Y88888  "Y8888        8888888P"   "Y88888P"      888     
                                                             888                                                   
                                                        Y8b d88P                                                   
                                                         "Y88P" \x1b[0m
  `);
  console.log("Flashloan Arbitrage Bot");
  console.log("Version: 0.0.1");
  console.log(`Running on ${process.env.CHAIN} Network`);
  console.log("Developed by: Miguel Acosta Bravo (c)");
  console.log();
  console.log("---");
};

export const printSwapEvent = (tickEvent: {
  name: string;
  pairAdress: string;
  token0: Token;
  token1: Token;
  sender: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  to: string;
}) => {
  const amountIn = tickEvent.amount0In
    ? tickEvent.amount0In
    : tickEvent.amount1In;
  const amountOut = tickEvent.amount0Out
    ? tickEvent.amount0Out
    : tickEvent.amount1Out;
  const tokenIn = tickEvent.amount0In ? tickEvent.token0 : tickEvent.token1;
  const tokenOut = tickEvent.amount0Out ? tickEvent.token0 : tickEvent.token1;

  console.table({
    "DEX Name": tickEvent.name,
    "Pair Address": tickEvent.pairAdress,
    "": {},
    "Sender Address": tickEvent.sender,
    "To Address": tickEvent.to,
    "-": {},
    "Token In Symbol": tokenIn.symbol,
    "Token In Addr.": tokenIn.address,
    "Token In Decimals": tokenIn.decimal,
    "Amount In": amountIn,
    "--": {},
    "Token Out Symbol": tokenOut.symbol,
    "Token Out Addr": tokenOut.address,
    "Token Out Decimals": tokenOut.decimal,
    "Amount Out": amountOut,
  });
};

export const getTokenName = (tokenAddr: string) => {
  const token = configuration.forward.find(
    (p) => p.tokenIn.address === tokenAddr
  );
  if (!token) {
    const token = configuration.forward.find(
      (p) => p.tokenOut.address === tokenAddr
    );
    return token
      ? token.tokenOut
      : {
          symbol: "UNKNOWN",
          address: tokenAddr,
          decimal: 18,
        };
  }
  return token.tokenIn;
};

export const getDexName = (pairAddr: string) => {
  const dex = configuration.forward.find((p) => p.dex.pair === pairAddr);
  if (!dex) {
    const dex = configuration.backward.find((p) => p.dex.pair === pairAddr);
    return dex ? dex.dex.name : "UNKNOWN";
  }
  return dex.dex.name;
};

export const sendSuccessfullMessage = async (
  tokenPath: string[],
  defaultToken: Token,
  amount: string,
  hash: string
) => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true,
  });

  bot.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `🎉 Successfull trade executed! 🎉

    **${new Date().toLocaleString()}**
    **${tokenPath.join(" > ")}**
    
    ${defaultToken.symbol} Profit Amount: ${formatUnits(
      amount,
      defaultToken.decimal
    )}
    Tx: ${hash}
    `,
    { parse_mode: "Markdown" }
  );
};

export const sendErrorMessage = async (tokenPath: string[]) => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true,
  });

  bot.sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `❌ Error on trade executed! ❌

    **${new Date().toLocaleString()}**
    **${tokenPath.join(" > ")}**
    `,
    { parse_mode: "Markdown" }
  );
};

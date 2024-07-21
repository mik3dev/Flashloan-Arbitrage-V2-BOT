import { Contract, Provider, Wallet, WebSocketProvider } from "ethers";
import { abi } from "../abis/FlashSwapUniswapV2.json";

export class FlashSwapUniswapV2 {
  private readonly provider: Provider;
  private readonly wallet: Wallet;
  private readonly flashbotV2Contract: Contract;

  constructor(
    _flashbotsV2Address: string,
    _privateKey: string,
    _wsProviderURL: string
  ) {
    this.provider = new WebSocketProvider(_wsProviderURL);
    this.wallet = new Wallet(_privateKey, this.provider);
    this.flashbotV2Contract = new Contract(
      _flashbotsV2Address,
      abi,
      this.wallet
    );
  }

  private async startListenFlashLoanRequested() {
    this.flashbotV2Contract.on(
      "FlashLoanRequested",
      (requestor: string, tokens: string[], amounts: string[]) => {
        console.log();
        console.log(
          `${
            new Date().toLocaleDateString
          } ${new Date().toLocaleTimeString()} - Flash-Loan Requested: `,
          { requestor, tokens, amounts }
        );
        console.log();
      }
    );
  }

  private async startListenFlashSwapCompleted() {
    this.flashbotV2Contract.on(
      "FlashSwapCompleted",
      (profitToken: string, profitAmount: string) => {
        console.log();
        console.log(
          `${
            new Date().toLocaleDateString
          } ${new Date().toLocaleTimeString()} - Flash-Swap Completed: `
        );
        console.table({
          profitToken,
          profitAmount,
        });
        console.log();
      }
    );
  }

  async startListening() {
    await this.startListenFlashLoanRequested();
    await this.startListenFlashSwapCompleted();
  }

  async requestFlashTrade(amount: string, tokens: string[], routers: string[]) {
    console.log();
    console.log("Requesting flash loan and trade...");
    try {
      const tx = await this.flashbotV2Contract.requestFlashTrade(
        amount,
        tokens,
        routers
      );
      await tx.wait();
      console.log(
        `${
          new Date().toLocaleDateString
        } ${new Date().toLocaleTimeString()} - Transaction: `,
        tx.hash
      );
      console.log();
      return tx;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

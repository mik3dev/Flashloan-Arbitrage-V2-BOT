import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";

import {
  Contract,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  Provider,
  Wallet,
  WebSocketProvider,
} from "ethers";

import { FlashSwapUniswapV2 } from "./flashswap-uniswap-v2";
import { DefaultToken, IBotConfiguration, Path } from "../types";
import Big from "big.js";

export class FlashSwapUniswapV2Bot {
  private readonly _provider: Provider;
  private readonly _flashSwapUniswapV2: FlashSwapUniswapV2;
  private defaultToken: DefaultToken | undefined;
  private forwardPath: Path[] = [];
  private backwardPath: Path[] = [];
  private _wallet: Wallet;
  private _gasLimit = 400000;
  private _gasPrice = 0.000000006;

  constructor(
    _privateKey: string,
    _wsProviderURL: string,
    _flashbotsV2Address: string
  ) {
    this._provider = new WebSocketProvider(_wsProviderURL);
    this._flashSwapUniswapV2 = new FlashSwapUniswapV2(
      _flashbotsV2Address,
      _privateKey,
      _wsProviderURL
    );
    // this._flashSwapUniswapV2.startListening();
    this._wallet = new Wallet(_privateKey, this._provider);
  }

  async initialize(configuration: IBotConfiguration) {
    console.log();
    console.log("Initializing bot...");
    console.log("Bot name: ", configuration.name);
    console.log("Bot description: ", configuration.description);
    this._gasLimit = configuration.gasLimit;
    this._gasPrice = configuration.gasPrice;
    this.defaultToken = configuration.defaultToken;
    this.defaultToken.defaultAmountIn = parseUnits(
      configuration.defaultToken.defaultAmountIn,
      this.defaultToken.decimal
    ).toString();

    for (const path of configuration.forward) {
      path.dex.factoryContract = this._fetchFactoryContract(path.dex.factory);
      path.dex.routerContract = this._fetchRouterContract(path.dex.router);
      path.dex.pairContract = await this._fetchPairContract(
        path.dex.factory,
        path.tokenIn.address,
        path.tokenOut.address
      );
    }

    for (const path of configuration.backward) {
      path.dex.factoryContract = this._fetchFactoryContract(path.dex.factory);
      path.dex.routerContract = this._fetchRouterContract(path.dex.router);
      path.dex.pairContract = await this._fetchPairContract(
        path.dex.factory,
        path.tokenIn.address,
        path.tokenOut.address
      );
    }
    this.backwardPath = configuration.backward;
    this.forwardPath = configuration.forward;
    console.log("Bot initialized!");
    console.log();
  }

  private _fetchFactoryContract(_factoryAddr: string) {
    return new Contract(_factoryAddr, IUniswapV2Factory.abi, this._provider);
  }

  private async _fetchPairContract(
    _factoryAddr: string,
    _token0Addr: string,
    _token1Addr: string
  ) {
    const factory = this._fetchFactoryContract(_factoryAddr);
    const pairAddr = await factory.getPair(_token0Addr, _token1Addr);
    return new Contract(pairAddr, IUniswapV2Pair.abi, this._provider);
  }

  private async _fetchTokens(_pairContact: Contract) {
    const token0Addr = await _pairContact.token0();
    const token1Addr = await _pairContact.token1();
    return [token0Addr, token1Addr];
  }

  private _fetchRouterContract(pairAddr: string) {
    return new Contract(pairAddr, IUniswapV2Router02.abi, this._provider);
  }

  getPairContracts() {
    return this.forwardPath.map((path) => path.dex.pairContract);
  }

  async calculateForwardPath() {
    console.log();
    console.log("Estimating \x1b[43mFORWARD\x1b[0m path profitability...");
    const amountIn = this.defaultToken!.defaultAmountIn;

    let prevAmountIn = this.defaultToken!.defaultAmountIn;
    let i = 0;
    for (const path of this.forwardPath) {
      if (
        i + 1 < this.forwardPath.length &&
        path.dex.name === this.forwardPath[i + 1].dex.name
      ) {
        const tokenPath = [
          path.tokenIn.address,
          path.tokenOut.address,
          this.forwardPath[i + 1].tokenOut.address,
        ];
        console.log(tokenPath);
        const [_amountIn, _amountOut] =
          await path.dex.routerContract!.getAmountsOut(prevAmountIn, tokenPath);
        prevAmountIn = _amountOut;
        i++;
        continue;
      } else if (
        i !== 0 &&
        path.dex.name === this.forwardPath[i - 1].dex.name
      ) {
        i++;
        continue;
      }
      const tokenPath = [path.tokenIn.address, path.tokenOut.address];
      const [_amountIn, _amountOut] =
        await path.dex.routerContract!.getAmountsOut(prevAmountIn, tokenPath);
      prevAmountIn = _amountOut;
      i++;
    }

    const amountOut = prevAmountIn;
    await this.logProfitability(
      Big(amountIn).toString(),
      Big(amountOut).toString(),
      this.defaultToken!
    );

    return {
      amountIn: Big(amountIn.toString()).toString(),
      amountOut: Big(amountOut.toString()).toString(),
      amountDiff: Big(amountOut.toString())
        .minus(amountIn.toString())
        .toString(),
    };
  }

  async calculateBackwardPath() {
    console.log();
    console.log("Estimating \x1b[43mBACKWARD\x1b[0m path profitability...");

    const amountIn = this.defaultToken!.defaultAmountIn;

    let prevAmountIn = this.defaultToken!.defaultAmountIn;
    let i = 0;
    for (const path of this.backwardPath) {
      if (
        i + 1 < this.backwardPath.length &&
        path.dex.name === this.backwardPath[i + 1].dex.name
      ) {
        const tokenPath = [
          path.tokenIn.address,
          path.tokenOut.address,
          this.backwardPath[i + 1].tokenOut.address,
        ];
        console.log(tokenPath);
        const [_amountIn, _amountOut] =
          await path.dex.routerContract!.getAmountsOut(prevAmountIn, tokenPath);
        prevAmountIn = _amountOut;
        i++;
        continue;
      } else if (
        i !== 0 &&
        path.dex.name === this.backwardPath[i - 1].dex.name
      ) {
        i++;
        continue;
      }
      const tokenPath = [path.tokenIn.address, path.tokenOut.address];
      const [_amountIn, _amountOut] =
        await path.dex.routerContract!.getAmountsOut(prevAmountIn, tokenPath);
      prevAmountIn = _amountOut;
      i++;
    }

    const amountOut = prevAmountIn;
    await this.logProfitability(
      Big(amountIn).toString(),
      Big(amountOut).toString(),
      this.defaultToken!
    );

    return {
      amountIn: Big(amountIn.toString()).toString(),
      amountOut: Big(amountOut.toString()).toString(),
      amountDiff: Big(amountOut.toString())
        .minus(amountIn.toString())
        .toString(),
    };
  }

  async estimateProfitability(amountDiff: string) {
    if (Big(amountDiff).gt(0)) return true;
    return false;
  }

  choosePath(
    forwardAmountDiff: string,
    backwardAmountDiff: string
  ): "forward" | "backward" | undefined {
    if (
      Big(forwardAmountDiff).gt(backwardAmountDiff) &&
      Big(forwardAmountDiff).gt(0)
    ) {
      return "forward";
    } else if (
      Big(backwardAmountDiff).gt(forwardAmountDiff) &&
      Big(backwardAmountDiff).gt(0)
    ) {
      return "backward";
    }
    return undefined;
  }

  async executeForwardPath() {
    console.log();
    console.log("Preparing to execute \x1b[43mFORWARD TRADE\x1b[0m...");
    const amountIn = this.defaultToken!.defaultAmountIn;
    const tokens = this.forwardPath.map((path) => path.tokenIn.address);
    const routers = this.forwardPath.map((path) => path.dex.router);
    const tx = await this._flashSwapUniswapV2.requestFlashTrade(
      amountIn,
      tokens,
      routers
    );
    return tx;
  }

  async executeBackwardPath() {
    console.log();
    console.log("Preparing to execute \x1b[43mBACKWARD TRADE\x1b[0m...");
    const amountIn = this.defaultToken!.defaultAmountIn;
    const tokens = this.backwardPath.map((path) => path.tokenIn.address);
    const routers = this.backwardPath.map((path) => path.dex.router);
    const tx = await this._flashSwapUniswapV2.requestFlashTrade(
      amountIn,
      tokens,
      routers
    );
    return tx;
  }

  async getEthBalance() {
    return await this._provider.getBalance(this._wallet.address);
  }

  async getTokenBalance(token: string) {
    const tokenContract = new Contract(token, ERC20.abi, this._provider);
    return await tokenContract.balanceOf(this._wallet.address);
  }

  async getBalances() {
    const ethBalance = await this.getEthBalance();
    const tokenBalance = await this.getTokenBalance(this.defaultToken!.address);
    return { ethBalance, tokenBalance };
  }

  private async logProfitability(
    amountIn: string,
    amountOut: string,
    token: DefaultToken
  ) {
    const amountDiff = Big(amountOut).minus(amountIn).toString();
    const estimatedGasCost = Big(this._gasLimit).times(this._gasPrice);
    const ethBalance = await this._provider.getBalance(this._wallet.address);
    const ethBalanceBefore = formatUnits(ethBalance, 18);
    const ethBalanceAfter = new Big(ethBalanceBefore).minus(
      estimatedGasCost.toString()
    );
    const tokenContract = new Contract(
      token.address,
      ERC20.abi,
      this._provider
    );
    const tokenBalance = await tokenContract.balanceOf(this._wallet.address);
    const tokenBalanceBefore = formatUnits(tokenBalance, token.decimal);
    const tokenBalanceAfter = Big(amountDiff).plus(tokenBalance);

    console.table({
      "ETH Balance Before": ethBalanceBefore,
      "ETH Balance After": ethBalanceAfter.toString(),
      "ETH Spent (gas)": estimatedGasCost.toString(),
      "": {},
      "Token amount in": formatUnits(amountIn.toString(), token.decimal),
      "Token amount out": formatUnits(amountOut.toString(), token.decimal),
      "Token Gained/Lost": formatUnits(amountDiff.toString(), token.decimal),
      "Token Balance Before": tokenBalanceBefore,
      "Token Balance After": formatUnits(
        tokenBalanceAfter.toString(),
        token.decimal
      ),
    });
  }

  logProfitReport({
    ethBalanceBefore,
    ethBalanceAfter,
    tokenBalanceAfter,
    tokenBalanceBefore,
  }: {
    ethBalanceBefore: string;
    ethBalanceAfter: string;
    tokenBalanceBefore: string;
    tokenBalanceAfter: string;
  }) {
    console.table({
      "ETH Balance Before": formatEther(ethBalanceBefore),
      "ETH Balance After": formatEther(ethBalanceAfter),
      "-": {},
      [`${this.defaultToken!.symbol} Balance Before`]: formatUnits(
        tokenBalanceBefore,
        this.defaultToken!.decimal
      ),
      [`${this.defaultToken!.symbol} Balance After`]: formatUnits(
        tokenBalanceAfter,
        this.defaultToken!.decimal
      ),
    });
  }
}

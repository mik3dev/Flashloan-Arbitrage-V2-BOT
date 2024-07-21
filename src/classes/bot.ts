import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";

import { Contract, Provider, WebSocketProvider } from "ethers";

import { FlashSwapUniswapV2 } from "./flashswap-uniswap-v2";
import { DefaultToken, IBotConfiguration, Path } from "../types";

export class Bot {
  private readonly _provider: Provider;
  private readonly _flashSwapUniswapV2: FlashSwapUniswapV2;
  private defaultToken: DefaultToken | undefined;
  private forwardPath: Path[] = [];
  private backwardPath: Path[] = [];

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
    this._flashSwapUniswapV2.startListening();
  }

  async initialize(configuration: IBotConfiguration) {
    console.log();
    console.log("Initializing bot...");
    console.log("Bot name: ", configuration.name);
    console.log("Bot description: ", configuration.description);
    this.defaultToken = configuration.defaultToken;
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
    console.log("Forward path:");
    console.log(this.forwardPath);
    console.log();
    console.log("Backward path:");
    console.log(this.backwardPath);
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
    return new Contract(pairAddr, IUniswapV2Pair.abi, this._provider);
  }
}

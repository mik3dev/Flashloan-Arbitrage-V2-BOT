import { Contract } from "ethers";

export type Token = {
  symbol: string;
  address: string;
  decimal: number;
};

export type DefaultToken = {
  symbol: string;
  address: string;
  decimal: number;
  defaultAmountIn: string;
};

export type Dex = {
  name: string;
  factory: string;
  factoryContract?: Contract;
  router: string;
  routerContract?: Contract;
  pair: string;
  pairContract?: Contract;
};

export type Path = {
  dex: Dex;
  tokenIn: Token;
  tokenOut: Token;
};

export interface IBotConfiguration {
  name: string;
  description: string;
  defaultToken: DefaultToken;
  forward: Path[];
  backward: Path[];
}

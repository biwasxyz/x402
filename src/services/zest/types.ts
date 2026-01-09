// Zest Protocol types

export interface ZestReserve {
  asset: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  total_borrowed: string;
  available_liquidity: string;
  utilization_rate: number;
  supply_apy: number;
  borrow_apy: number;
  ltv: number;
  liquidation_threshold: number;
  liquidation_bonus: number;
  price_usd: number;
}

export interface ZestUserPosition {
  user: string;
  asset: string;
  symbol: string;
  supplied: string;
  borrowed: string;
  supplied_usd: number;
  borrowed_usd: number;
  health_factor: number;
  collateral_enabled: boolean;
}

export interface ZestUserData {
  user: string;
  total_collateral_usd: number;
  total_debt_usd: number;
  available_borrow_usd: number;
  health_factor: number;
  liquidation_threshold: number;
  ltv: number;
  positions: ZestUserPosition[];
}

export interface ZestMarketStats {
  total_tvl_usd: number;
  total_borrowed_usd: number;
  total_available_usd: number;
  reserves: ZestReserve[];
}

export interface ZestInterestRateModel {
  asset: string;
  symbol: string;
  base_rate: number;
  slope1: number;
  slope2: number;
  optimal_utilization: number;
  current_utilization: number;
  current_supply_rate: number;
  current_borrow_rate: number;
}

// Zest contract addresses (mainnet)
export const ZEST_CONTRACTS = {
  POOL_BORROW: "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-borrow",
  POOL_RESERVE: "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-reserve-data",
  LIQUIDATION_MANAGER: "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.liquidation-manager",
  POOL_VAULT: "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-vault",
};

// Supported Zest assets
export const ZEST_ASSETS = {
  STX: {
    contract: "SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.wstx",
    symbol: "STX",
    decimals: 6,
  },
  sBTC: {
    contract: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-sbtc",
    symbol: "sBTC",
    decimals: 8,
  },
  stSTX: {
    contract: "SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.ststx-token",
    symbol: "stSTX",
    decimals: 6,
  },
  USDC: {
    contract: "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K.token-aeusdc",
    symbol: "aeUSDC",
    decimals: 6,
  },
};

// Risk parameters
export const ZEST_RISK_PARAMS = {
  MIN_HEALTH_FACTOR: 1.0,
  WARNING_HEALTH_FACTOR: 1.25,
  SAFE_HEALTH_FACTOR: 1.5,
  LIQUIDATION_CLOSE_FACTOR: 0.5,
};

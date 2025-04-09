import { IotaClient } from "@iota/iota-sdk/client";
import {
  BaseBalanceTracker,
  BaseBalanceTrackerConfig,
  IBalanceTracker,
} from "../interface";
import { DurationInSeconds } from "../utils";
import { PricePusherMetrics } from "../metrics";
import { Logger } from "pino";

/**
 * IOTA-specific configuration for balance tracker
 */
export interface IotaBalanceTrackerConfig extends BaseBalanceTrackerConfig {
  /** IOTA client instance */
  client: IotaClient;
}

/**
 * IOTA-specific implementation of the balance tracker
 */
export class IotaBalanceTracker extends BaseBalanceTracker {
  private client: IotaClient;

  constructor(config: IotaBalanceTrackerConfig) {
    super({
      ...config,
      logger: config.logger.child({ module: "IotaBalanceTracker" }),
    });

    this.client = config.client;
  }

  /**
   * IOTA-specific implementation of balance update
   */
  protected async updateBalance(): Promise<void> {
    try {
      // Get all coins owned by the address
      const { data: coins } = await this.client.getCoins({
        owner: this.address,
      });

      // Sum up all coin balances
      const totalBalance = coins.reduce((acc, coin) => {
        return acc + BigInt(coin.balance);
      }, BigInt(0));

      // Convert to a normalized number for reporting (IOTA has 9 decimals)
      const normalizedBalance = Number(totalBalance) / 1e9;

      this.metrics.updateWalletBalance(
        this.address,
        this.network,
        normalizedBalance,
      );

      this.logger.debug(
        `Updated IOTA wallet balance: ${this.address} = ${normalizedBalance} IOTA`,
      );
    } catch (error) {
      this.logger.error(
        { error },
        "Error fetching IOTA wallet balance for metrics",
      );
    }
  }
}

/**
 * Parameters for creating a IOTA balance tracker
 */
export interface CreateIotaBalanceTrackerParams {
  client: IotaClient;
  address: string;
  network: string;
  updateInterval: DurationInSeconds;
  metrics: PricePusherMetrics;
  logger: Logger;
}

/**
 * Factory function to create a balance tracker for IOTA chain
 */
export function createIotaBalanceTracker(
  params: CreateIotaBalanceTrackerParams,
): IBalanceTracker {
  return new IotaBalanceTracker({
    client: params.client,
    address: params.address,
    network: params.network,
    updateInterval: params.updateInterval,
    metrics: params.metrics,
    logger: params.logger,
  });
}

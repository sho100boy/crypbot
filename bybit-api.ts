import { bybit } from 'ccxt';

export class BybitApi {
  private exchange: bybit;

  constructor(apiKey: string, apiSecret: string, testnet: boolean) {
    this.exchange = new bybit({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      testnet,
    });
  }

  async getBalance() {
    const balance = await this.exchange.fetchBalance();
    return balance;
  }

  async getPrice(symbol: string) {
    const ticker = await this.exchange.fetchTicker(symbol);
    return ticker.last;
  }

  async placeOrder(symbol: string, side: 'Buy' | 'Sell', amount: number) {
    return await this.exchange.createMarketOrder(symbol, side, amount);
  }

  async closePosition(symbol: string) {
    return await this.exchange.createMarketOrder(symbol, 'Sell', 0);
  }

  async getPositions() {
    const positions = await this.exchange.fetchPositions();
    return positions;
  }
}
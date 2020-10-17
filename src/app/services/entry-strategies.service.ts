import { UtilsService } from './utils.service';
import { Injectable } from '@angular/core';
import { CandleAbstract } from '../abstract/candleAbstract';

@Injectable({
  providedIn: 'root'
})
export class EntryStrategiesService extends CandleAbstract {

  constructor(private utils: UtilsService) {
    super();
  }

  strategy_test(data: any, i: number): boolean {
    return this.close(data, i, 1) > this.open(data, i, 1) && this.close(data, i, 0) > this.open(data, i, 0);
  }


  strategy_LSD_Long(data, i: number): any {
    const lookback = 3;
    const swingHigh1 = this.utils.highest(data, i - 1, 'high', lookback);
    const swingHigh2 = this.utils.highest(data, i - 2, 'high', lookback);
    const swingLow1 = this.utils.lowest(data, i - 1, 'low', lookback);
    const swingLow2 = this.utils.lowest(data, i - 2, 'low', lookback);
    const smallRange1 = (swingHigh1 - swingLow1) < 0.005;
    const smallRange2 = (swingHigh2 - swingLow2) < 0.01;
    const liquidityPips = 0; // (swingHigh1 - swingLow1) / 5;
    const smallerLow1 = this.low(data, i, 3) > this.low(data, i, 2) && this.low(data, i, 2) > this.low(data, i, 1);
    const smallerLow2 = this.low(data, i, 4) > this.low(data, i, 3) && this.low(data, i, 3) > this.low(data, i, 2);

    const liquidityLow_OneCandle = !smallerLow1 && this.isUp(data, i, 0) && (swingLow1 - this.low(data, i, 0)) > liquidityPips;
    const liquidityLow_TwoCandlesDownUp = !smallerLow2 && smallRange2 && !this.isUp(data, i, 1) && this.isUp(data, i, 0) && (swingLow2 - this.low(data, i, 1)) > liquidityPips;
    const liquidityLow_TwoCandlesUp = !smallerLow2 && smallRange2 && this.isUp(data, i, 1) && (swingLow2 - this.low(data, i, 1)) > liquidityPips && this.isUp(data, i, 0);
    const breakoutUp = this.close(data, i, 0) > swingHigh1;

    // Si TwoCandle alors SL en dessous du swinglow ou de la -1 ?
    // Si TwoCandle, smallRange doit prendre en compte la -1 ?  01 Feb 2013 en 1H
    /*if (this.date(this.data, i, 0) === '2013-04-03 00:00') {
      console.log("Candle", this.data[i])
      console.log("Candle1", this.data[i-1])
      console.log("swinglow1", swingLow1);
      console.log("this.utils.isUp(this.data, i, 1)", this.utils.isUp(this.data, i, 1))
      console.log("this.utils.isUp(this.data, i, 0)", this.utils.isUp(this.data, i, 0))
      console.log("(swingLow1 - this.low(this.data, i, 1)) > liquidityPips", (swingLow1 - this.low(this.data, i, 1)) > liquidityPips)
    }*/

    const stopLossVar = (liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) ? swingLow2 : liquidityLow_OneCandle ? swingLow1 : NaN;

    return {
      startTrade: (liquidityLow_OneCandle || liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) && breakoutUp,
      stopLoss: stopLossVar,
      entryPrice: swingHigh1
    };
  }

}

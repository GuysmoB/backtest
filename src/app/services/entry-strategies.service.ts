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

  strategy_test1(data: any, i: number): any {
    return {
      startTrade: this.close(data, i, 1) > this.open(data, i, 1) && this.close(data, i, 0) > this.open(data, i, 0),
      stopLoss: this.low(data, i, 1),
      entryPrice: this.close(data, i, 0)
    };
  }

  strategy_test2(data: any, i: number): any {
    const sma = (this.close(data, i, 0) > this.utils.sma(data, i, 50));
    return {
      startTrade: !this.isUp(data, i, 1) && this.low(data, i, 0) < this.low(data, i, 1) && this.close(data, i, 0) > this.high(data, i, 1) && sma,
      stopLoss: this.low(data, i, 1),
      entryPrice: this.high(data, i, 1)
    };
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
    const sma = (this.close(data, i, 0) > this.utils.sma(data, i, 50));

    return {
      startTrade: (liquidityLow_OneCandle || liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) && breakoutUp && sma,
      stopLoss: stopLossVar,
      entryPrice: swingHigh1
    };
  }

  strategy_HA_Long(haData: any, data: any, i: number): any {
    const lookback = 3;
    
    let cond = true;
    for (let j = (i - 1); j >= (i - lookback); j--) {
      const ha = haData[j];
      if (ha.bull) {
        cond = false;
        break;
      }
    }

    return {
      startTrade: cond && haData[i].bull && data[i].ratio2p5 > 10,
      stopLoss: this.utils.lowest(haData, i - 1, 'low', 1),
      entryPrice: this.close(data, i, 0) + 5
    };
  }

  strategy_EngulfingRetested_Long(data: any, i: number, trigger: any): any {
    let retest: boolean;
    let sl: number;
    const bullRange = (this.close(data, i, 0) - this.open(data, i, 0)) >= ((this.open(data, i, 1) - this.close(data, i, 1)) * 2);
    const engulfing = !this.isUp(data, i, 1) && this.isUp(data, i, 0) && bullRange;

    if (trigger.length > 0) {
      if ((i - trigger[0].time <= 10) && this.low(data, i, 0) <= trigger[0].candle1.high && this.low(data, i, 0) > trigger[0].candle0.low) {
        retest = true;
        sl = trigger[0].candle1.low;
        trigger = [];
        console.log('retest', data[i])
      } else if (i - trigger[0].time > 10) {
        trigger = [];
        //console.log('timeout', data[i])
      }
    } else if (engulfing) {
      console.log('engulfing', data[i])
      trigger.push({ time: i, candle1: data[i - 1], candle0: data[i] });
    }

    return {
      startTrade: retest,
      stopLoss: sl,
      entryPrice: this.close(data, i, 0),
      trigger: trigger
    };
  }
}

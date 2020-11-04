import { IndicatorsService } from './indicators.service';
import { UtilsService } from './utils.service';
import { Injectable } from '@angular/core';
import { CandleAbstract } from '../abstract/candleAbstract';


@Injectable({
  providedIn: 'root'
})
export class EntryStrategiesService extends CandleAbstract {

  constructor(private utils: UtilsService, private indicators: IndicatorsService) {
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
    const sma = (this.close(data, i, 0) > this.indicators.sma(data, i, 50));
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

    const liquidityLow_OneCandle = /*!smallerLow1 &&*/this.isUp(data, i, 0) && (swingLow1 - this.low(data, i, 0)) > liquidityPips;
    const liquidityLow_TwoCandlesDownUp = !smallerLow2 && smallRange2 && !this.isUp(data, i, 1) && this.isUp(data, i, 0) && (swingLow2 - this.low(data, i, 1)) > liquidityPips;
    const liquidityLow_TwoCandlesUp = !smallerLow2 && smallRange2 && this.isUp(data, i, 1) && (swingLow2 - this.low(data, i, 1)) > liquidityPips && this.isUp(data, i, 0);
    const breakoutUp = this.close(data, i, 0) > swingHigh1;

    // Si TwoCandle alors SL en dessous du swinglow ou de la -1 ?
    // Si TwoCandle, smallRange doit prendre en compte la -1 ?  01 Feb 2013 en 1H

    const stopLossVar = (liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) ? swingLow2 : liquidityLow_OneCandle ? swingLow1 : NaN;
    const sma = (this.close(data, i, 0) > this.indicators.sma(data, i, 50));

    return {
      startTrade: (liquidityLow_OneCandle /*|| liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp*/) && breakoutUp,
      stopLoss: stopLossVar,
      entryPrice: swingHigh1
    };
  }

  strategy_HA_Long(haData: any, data: any, i: number): any {
    const lookback = 3;
    const bullCandle = haData[i].close > haData[i].open && haData[i].open >= haData[i].low;
    const swingLow = this.utils.lowest(haData, i - 1, 'low', lookback);
    const sma = (this.close(data, i, 0) > this.indicators.sma(data, i, 50));

    return {
      startTrade: bullCandle && sma,
      stopLoss: swingLow,
      entryPrice: this.close(data, i, 0)
    };
  }

  strategy_EngulfingRetested_Long(data: any, i: number, trigger: any, atr: any, arg?: number): any {
    let retest: boolean;
    let entryPrice: number;
    let sl: number;

    const maxTimeSpent = 20;
    const candle0Size = Math.abs(this.close(data, i, 0) - this.open(data, i, 0));
    const candle1Size = Math.abs(this.close(data, i, 1) - this.open(data, i, 1));
    const candle0SizeSetup2 = Math.abs(this.close(data, i, 0) - this.open(data, i, 0)) + Math.abs(this.close(data, i, 1) - this.open(data, i, 1));
    const candle1SizeSetup2 = Math.abs(this.open(data, i, 2) - this.close(data, i, 2));

    // l'engulfing ne doit pas avoir une grande mèche par rapport au body

    const liquidity = this.low(data, i, 0) < this.low(data, i, 1) && ((this.low(data, i, 1) - this.low(data, i, 0)) / atr[i]) > 0.1;
    const liquiditySetup2 = this.low(data, i, 1) < this.low(data, i, 2);
    const breakoutUp = this.close(data, i, 0) > this.high(data, i, 1);
    const breakoutUpSetup2 = this.close(data, i, 0) > this.high(data, i, 2);
    const setup1 = !this.isUp(data, i, 1) && (candle1Size / atr[i]) > 0.1 && this.isUp(data, i, 0) && (candle0Size >= candle1Size * 2) && liquidity && breakoutUp;

    if (data[i].date === "2017-02-23 00:00") {
      console.log()
    }

    /*const setup2 = !this.isUp(data, i, 2) && this.isUp(data, i, 1) && this.isUp(data, i, 0) &&
      (candle0SizeSetup2 >= candle1SizeSetup2 * 3) && liquiditySetup2 && breakoutUpSetup2;*/

    if (setup1) {
      this.logEnable ? console.log('engulfing', data[i].date, data[i - 1], data[i]) : NaN;
      //console.log('engulfing', data[i].date, data[i - 1], data[i]);
      trigger = [];
      trigger.push({ time: i, candle1: data[i - 1], candle0: data[i] });
    } else if (trigger.length > 0) {
      const timeSpent = i - trigger[0].time;

      if (timeSpent <= maxTimeSpent && this.low(data, i, 0) <= trigger[0].candle1.open) {
        retest = true;
        sl = trigger[0].candle1.low;
        entryPrice = trigger[0].candle1.open;
        trigger = [];
        this.logEnable ? console.log('retest', data[i].date) : NaN;
      } else if (timeSpent > maxTimeSpent) {
        trigger = [];
      }
    }

    return {
      startTrade: retest,
      stopLoss: sl,
      entryPrice: entryPrice,
      trigger: trigger
    };
  }
}

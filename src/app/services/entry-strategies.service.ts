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


  /**
   * Identifier une prise de liquidite, le garder en mémoire. Attendre un break
   */
  strategy_EngulfingRetested_Long(data: any, i: number, trigger: any, atr: any, arg?: number, arg2?: number): any {
    let retest: boolean;
    let entryPrice: number;
    let sl: number;

    const lookback = 10;
    const maxTimeSpent = 20;
    const swingHigh = this.utils.highest(data, i - 1, 'high', lookback);
    const swingLow = this.utils.lowest(data, i - 1, 'low', lookback);
    const candle0Size = Math.abs(this.close(data, i, 0) - this.open(data, i, 0));
    const candle1Size = Math.abs(this.close(data, i, 1) - this.open(data, i, 1));

    const liquidity = this.low(data, i, 0) < swingLow && ((swingLow - this.low(data, i, 0)) / atr[i]) > 0.1;
    const breakoutUp = this.close(data, i, 0) > this.high(data, i, 1) /*&& (candle0Size / atr[i]) > 2*/;
    const setup1 = /*!this.isUp(data, i, 1) &&*/ /*(candle1Size / atr[i]) > arg2 &&*/ this.isUp(data, i, 0) /*&& (candle0Size >= candle1Size * arg) */ && liquidity && breakoutUp;


    if (setup1) {
      this.logEnable ? console.log('engulfing', data[i].date, data[i - 1], data[i]) : NaN;
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




  /**
   * Identifier une prise de liquidite, le garder en mémoire. Attendre un break
   */
  strategy_LiquidityDelayed_Long(data: any, i: number, trigger: any, liquidity: any): any {
    let retest: boolean;
    let entryPrice: number;
    let sl: number;
    const maxTimeSpent = 20;
    let setup = liquidity && this.high(data, i, 0) > liquidity.swingHigh && this.isUp(data, i, 0);

    if (data[i].date === '2019-01-03 13:00') {
      console.log()
    }

    if (setup) {
      let lowerLow = false;
      for (let j = liquidity.time; j < i; j++) {
        const candle = data[j];
        if (candle.low < data[liquidity.time].low) {
          lowerLow = true;
        }
      }
      /*if (lowerLow || (i - liquidity.time) > 2) {
        setup = false;
        //console.log('setup with lowerlow', data[i].date)
      }*/
    }

    if (setup && trigger.length === 0) {
      this.logEnable ? console.log('setup', data[i].date/*, data[i - 1], data[i]*/) : NaN;
      trigger = [];
      trigger.push({ time: i, swingHigh: liquidity.swingHigh, swingLow: liquidity.swingLow });
    } else if (trigger.length > 0) {
      const timeSpent = i - trigger[0].time;

      if (timeSpent <= maxTimeSpent && this.low(data, i, 0) <= trigger[0].swingHigh) {
        retest = true;
        sl = trigger[0].swingLow;
        entryPrice = trigger[0].swingHigh;
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
      trigger: trigger,
    };
  }



  checkLiquidity(data: any, i: number, atr: any): any {
    let lastLow: number;
    let brokenLows = 0;
    const lookback = 10;
    const $swingHigh = this.utils.highest(data, i - 1, 'high', lookback);
    const $swingLow = this.utils.lowest(data, i - 1, 'low', lookback);
    const rangeHigh = this.utils.round(this.low(data, i, 0) + atr[i] * 1.5, 5);
    const rangeLow = this.low(data, i, 0);

    const candleSize = Math.abs(this.high(data, i, 0) - this.low(data, i, 0));

    for (let k = (i - 1); k >= (i - lookback); k--) {
      const candle = data[k];

      if (brokenLows === 0) {
        lastLow = candle.low;
      }

      if (candle.low < this.low(data, i, 0)) {
        return undefined;
      } else if (candle.low <= rangeHigh && candle.low >= rangeLow && candle.low <= lastLow) {
        brokenLows++;
        lastLow = candle.low;
      }
    }

    if (brokenLows >= 2) {
      //console.log('liquidity found !', data[i].date, brokenLows, rangeHigh, rangeLow);
      return {
        time: i,
        swingHigh: $swingHigh,
        swingLow: $swingLow
      };
    }
  }


}

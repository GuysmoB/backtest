import { UtilsService } from './utils.service';
import { Injectable } from '@angular/core';
import { CandleAbstract } from '../abstract/candleAbstract';

@Injectable({
  providedIn: 'root'
})
export class ExitStrategiesService extends CandleAbstract {

  constructor(private utils: UtilsService) {
    super();
  }


  getFixedTakeProfitAndStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, takeProfit: number): number {
    let result: number;

    if (this.low(data, i, 0) <= initialStopLoss) {
      this.logEnable ? console.log('SL', data[i]) : NaN;
      result = -1;
    } else if (this.high(data, i, 0) >= takeProfit) {
      this.logEnable ? console.log('TP', data[i]) : NaN;
      result = this.utils.getRiskReward(entryPrice, initialStopLoss, takeProfit);
    }

    return result;
  }

  /* getFixedTakeProfitAndStopLoss(direction: string, tickerTfData: any, price: number): number {
    let result: number;

    if (direction === 'LONG') {
      const entryPrice = tickerTfData.entryPrice_Long;
      const initialStopLoss = tickerTfData.initialStopLoss_Long;
      const takeProfit = tickerTfData.takeProfit_Long;

      if (price >= takeProfit) {
        result = this.utils.getRiskReward(entryPrice, initialStopLoss, takeProfit);
      } else if (price <= initialStopLoss) {
        result = -1;
      }
    } else if (direction === 'SHORT') {
      const entryPrice = tickerTfData.entryPrice_Short;
      const initialStopLoss = tickerTfData.initialStopLoss_Short;
      const takeProfit = tickerTfData.takeProfit_Short;

      if (price <= takeProfit) {
        result = this.utils.getRiskReward(entryPrice, initialStopLoss, takeProfit);
      } else if (price >= initialStopLoss) {
        result = -1;
      }
    } else {
      console.error('Long or Short ?');
    }

    return result;
  } */


  getFixedTakeProfitpAndBreakEvenStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number, targetRR: number): number {
    let result: number;
    const minTarget = 2;
    const step1 = entryPrice + (entryPrice - initialStopLoss) * minTarget;

    if (updatedStopLoss < entryPrice && this.high(data, i, 0) >= step1 && targetRR > minTarget) {
      updatedStopLoss = entryPrice;
    }

    if (this.high(data, i, 0) >= takeProfit) {
      result = this.utils.getRiskReward(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', data[i]) : NaN;
    } else if (this.low(data, i, 0) <= updatedStopLoss && updatedStopLoss === entryPrice) {
      result = 0;
      this.logEnable ? console.log('BE', data[i]) : NaN;
    } else if (this.low(data, i, 0) <= initialStopLoss) {
      result = -1;
      this.logEnable ? console.log('SL', data[i]) : NaN;
    }

    return result;
  }


  getTrailingStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number): number {
    let result: number;

    if (this.low(data, i, 0) <= updatedStopLoss) {
      result = this.utils.getRiskReward(entryPrice, initialStopLoss, updatedStopLoss);
      this.logEnable ? console.log('SL', data[i]) : NaN;
    }

    return result;
  }


  getFixeTakeProfitAndTrailingStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number): number {
    let result: number;

    if (this.high(data, i, 0) >= takeProfit) {
      result = this.utils.getRiskReward(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', data[i]) : NaN;
    } else if (this.low(data, i, 0) <= updatedStopLoss) {
      result = this.utils.getRiskReward(entryPrice, initialStopLoss, updatedStopLoss);
      this.logEnable ? console.log('SL', data[i]) : NaN;
    }

    return result;
  }


  getHeikenashiResult_long(haData: any, data: any, i: number, entryPrice: number, stopLoss: number): number {
    let result: number;

    if (this.low(data, i, 0) <= stopLoss) {
      result = this.utils.getPercentageResult(entryPrice, stopLoss);
    } else if (haData[i - 1].bull && haData[i].bear) {
      result = this.utils.getPercentageResult(entryPrice, this.close(data, i, 0)); 
    } 

    return result;
  }


  updateStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, trailingNumber: number): number {
    if (trailingNumber > 1) {
      console.error('trailingNumber too big');
    }

    //if (i - time !== 0) { // Ne pas MAJ directement lors du retest
      const step1 = entryPrice + (entryPrice - initialStopLoss) * 2;
      const step2 = entryPrice + (entryPrice - initialStopLoss) * 3;
      const newStopValue = entryPrice + (this.high(data, i, 0) - entryPrice) * trailingNumber;

      if (this.high(data, i, 0) >= step2 && newStopValue > updatedStopLoss) {
        updatedStopLoss = newStopValue;
        this.logEnable ? console.log('Trailing', this.date(data, i, 0), updatedStopLoss) : NaN;
      } else if (this.high(data, i, 0) >= step1 && updatedStopLoss < entryPrice) {
        updatedStopLoss = entryPrice;
        this.logEnable ? console.log('To BE', this.date(data, i, 0), updatedStopLoss) : NaN;
      }
    //}

    return updatedStopLoss;
  }


  timeExit(data: any, i: number, before: number, entryPrice: number): any {
    if ((i - before) >= 5) {
      return this.utils.round((this.close(data, i, 0) - entryPrice) / entryPrice, 5);
    }
  }


  getPcyExit(data: any, i: number, entryPrice: number, initialStopLoss: number, emaFast: any, emaSlow: any): number {
    try {
      const dist1 = emaFast[i - 1] - emaSlow[i - 1];
      const dist0 = emaFast[i] - emaSlow[i];

      if (this.low(data, i, 0) <= initialStopLoss) {
        this.logEnable ? console.log('SL', data[i]) : NaN;
        return -1;
      } else if (dist1 > dist0) {
        return this.utils.getRiskReward(entryPrice, initialStopLoss, this.close(data, i, 0));
      }
    } catch (error) {
      console.log(error);
    }
  }
}

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
      result = -1;
      this.logEnable ? console.log('SL', data[i]) : NaN;
    } else if (this.high(data, i, 0) >= takeProfit) {
      result = this.utils.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', data[i]) : NaN;
    }

    return result;
  }


  getFixedTakeProfitpAndBreakEvenStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number, targetRR: number): number {
    let result: number;
    const minTarget = 2;
    const step1 = entryPrice + (entryPrice - initialStopLoss) * minTarget;

    if (updatedStopLoss < entryPrice && this.high(data, i, 0) >= step1 && targetRR > minTarget) {
      updatedStopLoss = entryPrice;
    }

    if (this.high(data, i, 0) >= takeProfit) {
      result = this.utils.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
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
      result = this.utils.getRiskRewardSL(updatedStopLoss, entryPrice, initialStopLoss);
      this.logEnable ? console.log('SL', data[i]) : NaN;
    }

    return result;
  }


  getFixeTakeProfitAndTrailingStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number): number {
    let result: number;

    if (this.high(data, i, 0) >= takeProfit) {
      result = this.utils.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', data[i]) : NaN;
    } else if (this.low(data, i, 0) <= updatedStopLoss) {
      result = this.utils.getRiskRewardSL(updatedStopLoss, entryPrice, initialStopLoss);
      this.logEnable ? console.log('SL', data[i]) : NaN;
    }

    return result;
  }


  getHeikenAshi(haData: any, data: any, i: number, entryPrice: number, initialStopLoss: number): number {
    let result: number;
    const bull1 = (haData[i - 1].close > haData[i - 1].open) ? true : false;
    const bear = (haData[i].close < haData[i].open) ? true : false;

    if (this.low(data, i, 0) <= initialStopLoss) {
      result = -1;
    } else if (bull1 && bear) {
      result = this.utils.getRiskRewardTP(entryPrice, initialStopLoss, this.close(data, i, 0));
    }

    return result;
  }


  updateStopLoss(data: any, i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, trailingNumber: number): number {
    if (trailingNumber > 1) {
      console.error('trailingNumber too big');
    }

    const step1 = entryPrice + (entryPrice - initialStopLoss) * 2;
    const step2 = entryPrice + (entryPrice - initialStopLoss) * 3;

    if (this.high(data, i, 0) >= step1 && updatedStopLoss < entryPrice) {
      updatedStopLoss = entryPrice;
      this.logEnable ? console.log('To BE', this.date(data, i, 0)) : NaN;
    }

    if (this.high(data, i, 0) >= step2 && (entryPrice + (this.high(data, i, 0) - entryPrice) * trailingNumber) > updatedStopLoss) {
      updatedStopLoss = entryPrice + (this.high(data, i, 0) - entryPrice) * trailingNumber;
      this.logEnable ? console.log('Trailing', this.date(data, i, 0)) : NaN;
    }

    return updatedStopLoss;
  }

}

import { indicatorExponentialMovingAverage } from '@d3fc/d3fc-technical-indicator';
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

   strategy_HA_Long(haData: any, data: any, i: number, rsiValues: any, arg: any): any {
    const lookback = 5;
    
    let cond = true;
    for (let j = (i - 1); j >= (i - lookback); j--) {
      const ha = haData[j];
      if (ha.bull) {
        cond = false;
        break;
      }
    }
   
    /* let cond2 = false;
    for (let j = (i - 1); j >= (i - 10); j--) {
      if (data[i].ratio2p5 > arg) {
        cond2 = true;
        //debugger
        break;
      }
    } */


    return {
      startTrade: cond  && haData[i].bull /* && rsiValues[i] > arg */ /* && data[i].ratio2p5 >= 0 */,
      stopLoss: haData[i].low,
      entryPrice: this.close(data, i, 0)
    };
  }

}

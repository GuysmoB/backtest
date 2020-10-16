import { GraphService } from './services/graph.service';
import { Utils } from './abstract/utils';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';

// https://www.fusioncharts.com/dev/fusiontime/fusiontime-attributes
// https://www.fusioncharts.com/dev/fusiontime/getting-started/how-fusion-time-works
// https://stackblitz.com/run?file=indicator-data.ts

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent extends Utils implements OnInit {

  /**
   * ## TODO ##
   * interêts composés,
   * Intégrés les courbes des R:R gagnés,
   * 
   */

  assetsArray = ['EURUSD1440.csv'];
  //assetsArray = ['AUDCHF60.csv', 'EURGBP60.csv', 'EURUSD60.csv'];
  data = [];
  finalData = [];
  winTrades = [];
  loseTrades = [];
  allTrades = [];
  timeMarkerArray = [];
  dataSource: any;
  oopen = 1.29371;
  hhigh = 1.29891;
  llow = 1.29081;
  cclose = 1.29181;
  type: string;
  width: string;
  height: string;
  displayChart = false;
  logEnable = false;

  constructor(private http: HttpClient, private graphService: GraphService) {
    super();
   }


  async ngOnInit(): Promise<void> {
    for (let a = 0; a < this.assetsArray.length; a++) {
      this.data = [];
      await this.getDataFromFile(this.assetsArray[a]);
      this.runBacktest();  
    }
    console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
    console.log('Total R:R', this.round(this.loseTrades.reduce((a,b) => a + b, 0) + this.winTrades.reduce((a,b) => a + b, 0), 2));
    console.log('Avg R:R', this.round(this.allTrades.reduce((a,b) => a + b, 0) / this.allTrades.length, 2));
    console.log('Winrate ' +this.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) +'%');
    
    this.finalData = this.data.map((res) => {
      return [
        res.date,
        res.open,
        res.high,
        res.low,
        res.close,
        res.volume];
    });
    this.initGraphProperties();
    const fusionTable = new FusionCharts.DataStore().createDataTable(this.finalData, this.graphService.schema);
    this.dataSource.data = fusionTable;
  }


  getDataFromFile(devise: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/' +devise, { responseType: 'text' }).subscribe(
        (data) => {
          console.log('-------------');
          console.log('File :', devise);
          const csvToRowArray = data.split('\r\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split('\t'); // d, o, h, l, c, v
            this.data.push({
              date: element[0],
              open: parseFloat(element[1]),
              high: parseFloat(element[2]),
              low: parseFloat(element[3]),
              close: parseFloat(element[4]),
              volume: parseFloat(element[5])
            });
          }
          resolve();
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      );
    });
  }


  runBacktest(): void {
    let entryPrice: any;
    let initialStopLoss: any;
    let updatedStopLoss: any;
    let takeProfit: any;
    //let rrArray = [4, 5, 6, 7, 8, 9, 10];
    let rrArray = [5];
    let longTimeMarker: any;

    for (let j = 0; j < rrArray.length; j++) {
      let inLong = false;
      let isTrailingStopLoss = false;
      let isFixedTakeProfitAndTrailingStopLoss = true;
      let isFixedTakeProfitAndStopLoss = false;
      let isFixedTakeProfitAndBreakEvenStopLoss = false;
      let isHeikenAshi = false;
      let targetRR = rrArray[j];

      for (let i = 10; i < this.data.length; i++) {       //for (let i = 3989; i < 4101; i++) {
        if (i === (this.data.length - 1)) {
          inLong = false;
        }
        
        if (i === 11 || i === 12) {
          console.log('candle', this.data[i]);
          console.log('haClose', this.haClose(i));
          console.log('haOpen', this.haOpen(i));
          console.log('haLow', this.haLow(i));
          console.log('haHigh', this.haHigh(i));

        }
        
        let rr: number;
        if (inLong) {
          if (isFixedTakeProfitAndStopLoss) {
            rr = this.getFixedTakeProfitAndStopLoss(i, entryPrice, initialStopLoss, takeProfit)
          } else if (isFixedTakeProfitAndBreakEvenStopLoss) {
            rr = this.getFixedTakeProfitpAndBreakEvenStopLoss(i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit, targetRR);
          } else if (isTrailingStopLoss) {
            rr = this.getTrailingStopLoss(i, entryPrice, initialStopLoss, updatedStopLoss);
          } else if (isFixedTakeProfitAndTrailingStopLoss) {
            rr = this.getFixeTakeProfitAndTrailingStopLoss(i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit);       
          } else if (isHeikenAshi) {
            
          }
        }	
    
        if (rr !== undefined) {
          inLong = false;
          this.allTrades.push(rr);
          longTimeMarker.end = this.date(i, 0);
          this.timeMarkerArray.push(longTimeMarker);
    
          if (rr >= 0) {
            this.winTrades.push(rr);
          } else if (rr < 0) {
            this.loseTrades.push(rr);
          }
        }
    
        if (!inLong) {
          const res = this.strategy_LSD_Long(i);
          if (res.startTrade) {
            inLong = true;
            entryPrice = res.entryPrice;
            initialStopLoss = updatedStopLoss = res.stopLoss;
            takeProfit = entryPrice + (entryPrice - initialStopLoss) * targetRR;
            longTimeMarker = this.setLongTimeMarker(i);
          }
        }
      }
    } // Fin RR array
  }


  /**
   *
   * 
   * * * * STRATEGIES D'ENTREE * * * *
   *  
   */

  strategy_test(i: number): boolean {
    return this.close(i, 1) > this.open(i, 1) && this.close(i, 0) > this.open(i, 0);
  }


  strategy_LSD_Long(i: number): any {
    const lookback = 3;
    const swingHigh1 = this.highest(i - 1, 'high', lookback);
    const swingHigh2 = this.highest(i - 2, 'high', lookback);
    const swingLow1 = this.lowest(i - 1, 'low', lookback);
    const swingLow2 = this.lowest(i - 2, 'low', lookback);
    const smallRange1 = (swingHigh1 - swingLow1) < 0.005;
    const smallRange2 = (swingHigh2 - swingLow2) < 0.01;
    const liquidityPips = 0//(swingHigh1 - swingLow1) / 5;
    const smallerLow1 = this.low(i, 3) > this.low(i, 2) && this.low(i, 2) > this.low(i, 1);
    const smallerLow2 = this.low(i, 4) > this.low(i, 3) && this.low(i, 3) > this.low(i, 2);

    const liquidityLow_OneCandle = !smallerLow1 && this.isUp(i, 0) && (swingLow1 - this.low(i, 0)) > liquidityPips;
    const liquidityLow_TwoCandlesDownUp = !smallerLow2 && smallRange2 && !this.isUp(i, 1) && this.isUp(i, 0) && (swingLow2 - this.low(i, 1)) > liquidityPips;
    const liquidityLow_TwoCandlesUp = !smallerLow2 && smallRange2 && this.isUp(i, 1) && (swingLow2 - this.low(i, 1)) > liquidityPips && this.isUp(i, 0);
    const breakoutUp = this.close(i, 0) > swingHigh1;

    // Si TwoCandle alors SL en dessous du swinglow ou de la -1 ?
    // Si TwoCandle, smallRange doit prendre en compte la -1 ?  01 Feb 2013 en 1H
    /*if (this.date(i, 0) === '2013-04-03 00:00') {
      console.log("Candle", this.data[i])
      console.log("Candle1", this.data[i-1])
      console.log("swinglow1", swingLow1);
      console.log("this.isUp(i, 1)", this.isUp(i, 1))
      console.log("this.isUp(i, 0)", this.isUp(i, 0))
      console.log("(swingLow1 - this.low(i, 1)) > liquidityPips", (swingLow1 - this.low(i, 1)) > liquidityPips)
    }*/

    const stopLoss = (liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) ? swingLow2 : liquidityLow_OneCandle ? swingLow1 : NaN;

    return {
      startTrade: (liquidityLow_OneCandle || liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) && breakoutUp,
      stopLoss: stopLoss,
      entryPrice: swingHigh1
    }
  }
  
  /**
   *
   * * * * TAKE PROFIT AND STOP LOSS STRATEGIES * * * *
   *  
   */

  getFixedTakeProfitAndStopLoss(i: number, entryPrice: number, initialStopLoss: number, takeProfit: number) {
    let result: number;
  
    if (this.low(i, 0) <= initialStopLoss) {
      result = -1;       
      this.logEnable ? console.log('SL', this.data[i]) : NaN;
    } else if (this.high(i, 0) >= takeProfit) {
      result = this.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', this.data[i]) : NaN;
    }
   
      return result;
  }


  getFixedTakeProfitpAndBreakEvenStopLoss(i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number, targetRR: number) {
    let result: number;
    updatedStopLoss = this.updateStopLossToBreakEven(this.data[i], entryPrice, initialStopLoss, updatedStopLoss, targetRR);

    if (this.low(i, 0) <= initialStopLoss) {
      result = -1;
      this.logEnable ? console.log('SL', this.data[i]) : NaN;
    } else if (this.low(i, 0) <= entryPrice && updatedStopLoss === entryPrice) {
      result = 0;
    } else if (this.high(i, 0) >= takeProfit) {
      result = this.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', this.data[i]) : NaN;
    } 
   
      return result;
  }


  getTrailingStopLoss(i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number) {
    let result: number;
    updatedStopLoss = this.updateStopLoss(this.data[i], entryPrice, initialStopLoss, updatedStopLoss, 0.9);
  
    if (this.low(i, 0) <= updatedStopLoss) {
      result = this.getRiskRewardSL(updatedStopLoss, entryPrice, initialStopLoss);
      this.logEnable ? console.log('SL', this.data[i]) : NaN;
    }	
  
    return result;
  }


  getFixeTakeProfitAndTrailingStopLoss(i: number, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, takeProfit: number) {
    let result: number;
    updatedStopLoss = this.updateStopLoss(this.data[i], entryPrice, initialStopLoss, updatedStopLoss, 0.5);

    if (this.high(i, 0) >= takeProfit) {
      result = this.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
      this.logEnable ? console.log('TP', this.data[i]) : NaN;
    } else if (this.low(i, 0) <= updatedStopLoss) {
      result = this.getRiskRewardSL(updatedStopLoss, entryPrice, initialStopLoss);
      this.logEnable ? console.log('SL', this.data[i]) : NaN;
    }	 
  
    return result;
  }



  updateStopLoss(candle: any, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, trailingNumber: number): any {
    if (trailingNumber > 1) { 
      console.error('trailingNumber too big');
    }
    
    let step1 = entryPrice + (entryPrice - initialStopLoss) * 2;
    let step2 = entryPrice + (entryPrice - initialStopLoss) * 3;

    if (candle.high >= step1 && updatedStopLoss < entryPrice) {
      updatedStopLoss = entryPrice;
      this.logEnable ? console.log('To BE', candle.date) : NaN;
    }

    if (candle.high >= step2 && (entryPrice + (candle.high - entryPrice) * trailingNumber) > updatedStopLoss) {
      updatedStopLoss = entryPrice + (candle.high - entryPrice) * trailingNumber;
      this.logEnable ? console.log('Starting Trailing', candle.date) : NaN;
    }

    return updatedStopLoss;
  }
  

  updateStopLossToBreakEven(candle: any, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, targetRR: number): number {
    let step1 = entryPrice + (entryPrice - initialStopLoss) * 2;

    if (candle.high >= step1 && updatedStopLoss < entryPrice && targetRR > 2) {
      updatedStopLoss = entryPrice;
      this.logEnable ? console.log('To BE', candle.date) : NaN;
    }

    return updatedStopLoss;
  }


  getRiskRewardSL(updatedStopLoss: number, entryPrice: number, initialStopLoss: number) {  
      return this.round((updatedStopLoss - entryPrice) / (entryPrice - initialStopLoss), 2);
  }

  getRiskRewardTP(entryPrice: number, initialStopLoss: number, takeProfit: number) {
    return this.round((takeProfit - entryPrice) / (entryPrice - initialStopLoss), 2);
  }

  
  /**
   * Retourne la valeur maximale en fonction de la source et de lookback
   */
  highest(index: number, source: string, lookback: number): number {
    let max: number;

    for (let k = 0; k < lookback; k++) {
      if (k === 0) {
        max = this.data[index - k][source];
      }

      if (this.data[index - k][source] > max) {
        max = this.data[index - k][source];
      }
    }
    return max;
  }


  /**
   * Retourne la valeur minimale en fonction de la source et de lookback
   */
  lowest(index: number, source: string, lookback: number): number {
    let min: number;

    for (let k = 0; k < lookback; k++) {
      if (k === 0) {
        min = this.data[index - k][source];
      }

      if (this.data[index - k][source] < min) {
        min = this.data[index - k][source];
      }
    }
    return min;
  }


  isUp(index: number, lookback: number): boolean {
    return (this.data[index - lookback].close > this.data[index - lookback].open);
  }

  open(index: number, lookback: number): number {
    return this.data[index - lookback].open;
  }

  close(index: number, lookback: number): number {
    return this.data[index - lookback].close;
  }

  high(index: number, lookback: number): number {
    return this.data[index - lookback].high;
  }

  low(index: number, lookback: number): number {
    return this.data[index - lookback].low;
  }

  date(index: number, lookback: number): string {
    return this.data[index - lookback].date;
  }

/**
 * haopen  = 0.0
haclose = (open + high + low + close) / 4
haopen := na(haopen[1]) ? (open + close) / 2 : (haopen[1] + haclose[1]) / 2
hahigh  = max(high, max(haopen, haclose))
halow   = min(low,  min(haopen, haclose))
 */

  haClose(i: number): number {
    //return this.round((this.open(i, 0) + this.high(i, 0) + this.low(i, 0) + this.close(i, 0)) / 4, 5); 
    return this.round((this.oopen + this.hhigh + this.llow + this.cclose) / 4, 5); 
  }

  haOpen(i: number) {
    //return this.round((this.open(i, 1) + this.close(i, 1)) / 2, 5);
    return this.round((1.29151 + 1.29371) / 2, 5);
  }

  haHigh(i: number) {
    //return Math.max(this.high(i, 0), Math.max(this.haOpen(i), this.haClose(i)));
    return Math.max(this.hhigh, Math.max(this.haOpen(i), this.haClose(i)));
  }

  haLow(i: number) {
    //return Math.min(this.low(i, 0), Math.max(this.haOpen(i), this.haClose(i)));
    return Math.min(this.llow, Math.max(this.haOpen(i), this.haClose(i)));
  }

  /**
   * Arrondi un nombre avec une certaine précision.
   */
  round(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }


  setLongTimeMarker(i: number): any {
    return {
      start: this.date(i, 0),
      end: '',
      label: 'Long',
      timeFormat: '%Y-%m-%d %H:%M',
      type: 'full',
      style: {
        marker: {
          fill: '#56ba49'
        }
      }
    };
  }

  initGraphProperties(): void {
    this.type = 'timeseries';
    this.width = '100%';
    this.height = '600';
    this.dataSource = this.graphService.dataSource;
    this.dataSource.xAxis.timemarker = this.timeMarkerArray;
  }
}

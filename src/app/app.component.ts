import { GraphService } from './services/graph.service';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as FusionCharts from 'fusioncharts';
import { analyzeAndValidateNgModules } from '@angular/compiler';
import { ChartTheme, IAxisLabelRenderEventArgs, IStockChartEventArgs, ITooltipRenderEventArgs } from '@syncfusion/ej2-angular-charts';

// https://www.fusioncharts.com/dev/fusiontime/fusiontime-attributes
// https://www.fusioncharts.com/dev/fusiontime/getting-started/how-fusion-time-works
// https://stackblitz.com/run?file=indicator-data.ts

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {

  /**
   * ## TODO ##
   * interêts composés,
   * Intégrés les courbes des R:R gagnés,
   * 
   */

  data = [];
  finalData = [];
  timeMarkerArray = [];
  dataSource: any;
  type: string;
  width: string;
  height: string;
  inLong = false;
  logEnable = true;
  displayChart = false;
  isTrailingEnabled = true;

  constructor(private http: HttpClient, private graphService: GraphService) { }


  async ngOnInit(): Promise<void> {
    await this.getDataFromFile();
    this.runBacktest();
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


  getDataFromFile(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/EURUSD60.csv', { responseType: 'text' }).subscribe(
        (data) => {
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
    //let rrArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let rrArray = [5];
    let longTimeMarker: any;
    console.log('data length', this.data.length);

    for (let rr = 1; rr <= rrArray.length; rr++) {
      rr = this.isTrailingEnabled ? 2 : rr;
      let winTrades = [];
      let loseTrades = [];
      let allTrades = [];

      for (let i = 10; i < this.data.length; i++) {
      //for (let i = 3989; i < 4101; i++) {

        if (this.inLong) {
          updatedStopLoss = this.updateStopLoss(this.data[i], entryPrice, initialStopLoss, updatedStopLoss, i);
          takeProfit = (updatedStopLoss !== initialStopLoss) ? takeProfit = NaN : takeProfit;
          console.log('update SL', updatedStopLoss);

          if (this.low(i, 0) <= updatedStopLoss) {
            this.inLong = false;
            let finalRR = this.getRiskRewardSL(updatedStopLoss, entryPrice, initialStopLoss, takeProfit);
            console.log('get RR SL', finalRR);
            finalRR > 0 ? winTrades.push(finalRR) : loseTrades.push(finalRR);
            allTrades.push(finalRR);
            longTimeMarker.end = this.date(i, 0);
            this.timeMarkerArray.push(longTimeMarker);
            this.logEnable ? console.log('SL', this.data[i]) : NaN;
          }
        }

        if (this.inLong) {
          if (this.high(i, 0) >= takeProfit && !this.isTrailingEnabled) {
            this.inLong = false;
            let finalRR2 = this.getRiskRewardTP(entryPrice, initialStopLoss, takeProfit);
            console.log('get RR TP', finalRR2);
            winTrades.push(finalRR2);
            allTrades.push(finalRR2);
            longTimeMarker.end = this.date(i, 0);
            this.timeMarkerArray.push(longTimeMarker);
            this.logEnable ? console.log('TP', this.data[i]) : NaN;
          }
        }

        if (!this.inLong) {
          const res = this.strategy_LSD_Long(i, rr);
          if (res.startTrade) {
            this.inLong = true;
            entryPrice = res.entryPrice;
            initialStopLoss = res.stopLoss
            updatedStopLoss = res.stopLoss
            takeProfit = res.takeProfit;
            longTimeMarker = this.setLongTimeMarker(i);

            if (this.logEnable) {
              console.log('---');
              console.log('Entry data', this.data[i]);
              console.log('Candle number', i);
              console.log('entryPrice', entryPrice);
              console.log('init stopLoss', initialStopLoss);
              //console.log('R:R', rr);
              console.log('takeProfit', this.round(takeProfit, 5));
            } 
          }
        }
      }
      console.log('-------------');
      console.log('Trades : Gagnes / Perdus / Total', winTrades.length, loseTrades.length, winTrades.length + loseTrades.length);
      console.log('R:R target', rr);
      console.log('Total R:R', loseTrades.reduce((a,b) => a + b, 0) + winTrades.reduce((a,b) => a + b, 0));
      console.log('Avg R:R', this.round(allTrades.reduce((a,b) => a + b, 0) / allTrades.length, 2));
      console.log('Winrate ' +this.round(winTrades.length / (loseTrades.length + winTrades.length), 2) * 100 +'%');
    } // Fin RR array
  }




  strategy_test(i: number): boolean {
    return this.close(i, 1) > this.open(i, 1) && this.close(i, 0) > this.open(i, 0);
  }


  strategy_LSD_Long(i: number, rr: number): any {
    const lookback = 3;
    const swingHigh1 = this.highest(i - 1, 'high', lookback);
    const swingHigh2 = this.highest(i - 2, 'high', lookback);
    const swingLow1 = this.lowest(i - 1, 'low', lookback);
    const swingLow2 = this.lowest(i - 2, 'low', lookback);
    const range1 = (swingHigh1 - swingLow1);
    const range2 = (swingHigh2 - swingLow2);
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
      entryPrice: swingHigh1,
      takeProfit: swingHigh1 + (swingHigh1 - stopLoss) * rr
    }
  }


  updateTakeProfit(candle: any, entryPrice: number, initialStopLoss: number, updatedTP: number) {
    if (this.isTrailingEnabled) {
      let rr2 = entryPrice + (entryPrice - initialStopLoss) * 2;
      let rr3 = entryPrice + (entryPrice - initialStopLoss) * 3;
  
      if (candle.high >= rr2 && updatedTP < entryPrice) {
        updatedTP = entryPrice;
      }
  
      if (candle.high >= rr3 && ((candle.high - entryPrice) * 0.5) > updatedTP) {
        updatedTP = (candle.high - entryPrice) * 0.5;
      }
    }
  
    return updatedTP;
  }

  updateStopLoss(candle: any, entryPrice: number, initialStopLoss: number, updatedStopLoss: number, i: number): any {
    if (this.isTrailingEnabled) {
      let rr2 = entryPrice + (entryPrice - initialStopLoss) * 2;
      let rr3 = entryPrice + (entryPrice - initialStopLoss) * 2.5;
  
      if (candle.high >= rr2 && updatedStopLoss < entryPrice) {
        updatedStopLoss = entryPrice;
        console.log('To BE', candle)
      }
  
      if (candle.high >= rr3 && (entryPrice + (candle.high - entryPrice) * 0.5) > updatedStopLoss) {
        updatedStopLoss = entryPrice + (candle.high - entryPrice) * 0.5;
      }
    }

    return updatedStopLoss;
  }
  

  getRiskRewardSL(updatedStopLoss: number, entryPrice: number, initialStopLoss: number, takeProfit: number) {
    if (updatedStopLoss >= entryPrice) {
      return this.round((updatedStopLoss - entryPrice) / (entryPrice - initialStopLoss), 2);
    } else {
      return this.round((takeProfit - entryPrice) / (entryPrice - initialStopLoss), 2);
    }
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

  volume(index: number, lookback: number): number {
    return this.data[index - lookback].volume;
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

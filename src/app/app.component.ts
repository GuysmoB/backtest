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

  data = [];
  winTrades = [];
  loseTrades = [];
  finalData = [];
  timeMarkerArray = [];
  dataSource: any;
  type: string;
  width: string;
  height: string;
  inLong = false;
  logEnable = false;

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
    let buyPrice: any;
    let stopPrice: any;
    let profitPrice: any;
    let longTimeMarker: any;
    console.log('data length', this.data.length);

    for (let i = 10; i < this.data.length; i++) {
      if (this.inLong) {
        if (this.low(i, 0) <= stopPrice) {
          this.inLong = false;
          this.loseTrades.push(-1);
          longTimeMarker.end = this.date(i, 0);
          this.timeMarkerArray.push(longTimeMarker);
          this.logEnable ? console.log('SL', this.data[i]) : '';
        }
      }

      if (this.inLong) {
        if (this.high(i, 0) >= profitPrice) {
          this.inLong = false;
          this.winTrades.push(2);
          longTimeMarker.end = this.date(i, 0);
          this.timeMarkerArray.push(longTimeMarker);
          this.logEnable ? console.log('TP', this.data[i]) : '';
        }
      }

      if (!this.inLong) {
        if (this.strategy_LSD_Long(i)) {
          this.inLong = true;
          buyPrice = this.close(i, 0);
          stopPrice = this.low(i, 0);
          profitPrice = buyPrice + (buyPrice - stopPrice) * 1;
          if (this.logEnable) {
            console.log('-------------');
            console.log('Entry trade', this.data[i]);
            console.log('buyPrice', buyPrice);
            console.log('stopPrice', stopPrice);
            console.log('profitPrice', this.round(profitPrice, 5));
          } 
          longTimeMarker = this.setLongTimeMarker(i);
        }
      }
    }
    console.log('Number of trades', this.loseTrades.length + this.winTrades.length);
    console.log('Total R:R', this.getTotalWin(this.loseTrades) + this.getTotalWin(this.winTrades));
    console.log('Winrate %', this.round(this.loseTrades.length / (this.loseTrades.length + this.winTrades.length), 2));
  }




  strategy_test(i: number): boolean {
    return this.close(i, 1) > this.open(i, 1) && this.close(i, 0) > this.open(i, 0);
  }


  strategy_LSD_Long(i: number): boolean {
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

    const liquidityLow_OneCandle = this.isUp(i, 0) && (swingLow1 - this.low(i, 0)) > liquidityPips;
    const liquidityLow_TwoCandlesDownUp = smallRange2 && !this.isUp(i, 1) && this.isUp(i, 0) && (swingLow2 - this.low(i, 1)) > liquidityPips;
    const liquidityLow_TwoCandlesUp = smallRange2 && this.isUp(i, 1) && (swingLow2 - this.low(i, 1)) > liquidityPips && this.isUp(i, 0);
    const breakoutUp = this.close(i, 0) > swingHigh1;
    //const exception = 3 low de plus en plus faible avec One et Two candle
    // Si TwoCandle alors SL en dessous du swinglow ou de la -1 ?
    // Si TwoCandle, smallRange doit prendre en compte la -1 ?  01 Feb 2013 en 1H
    if (this.date(i, 0) === '2013-04-03 00:00') {
      console.log("Candle", this.data[i])
      console.log("Candle1", this.data[i-1])
      console.log("swinglow1", swingLow1);
      console.log("this.isUp(i, 1)", this.isUp(i, 1))
      console.log("this.isUp(i, 0)", this.isUp(i, 0))
      console.log("(swingLow1 - this.low(i, 1)) > liquidityPips", (swingLow1 - this.low(i, 1)) > liquidityPips)
    }

    return (liquidityLow_OneCandle || liquidityLow_TwoCandlesDownUp || liquidityLow_TwoCandlesUp) && breakoutUp;
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


  getTotalWin(result: any[]): number {
    let total = 0;
    result.forEach(element => {
      total += element;
    });

    return total;
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

import { IndicatorsService } from './services/indicators.service';
import { ExitStrategiesService } from './services/exit-strategies.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { CandleAbstract } from './abstract/candleAbstract';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent extends CandleAbstract implements OnInit {

  /**
   * ## TODO ##
   */

  assetsArray = ['EURGBP60.csv'];
  //assetsArray = ['AUDCHF60.csv', 'EURGBP60.csv', 'EURUSD60.csv', 'GBPUSD60.csv', 'USDCAD60.csv', 'USDJPY60.csv'];
  data = [];
  haData = [];
  winTrades = [];
  loseTrades = [];
  allTrades = [];
  timeMarkerArray = [];
  dataSourceCandle: any;
  dataSourceRisk: any;
  dataSourceInterest: any;
  displayChart = true;

  constructor(private http: HttpClient, private graphService: GraphService, private utils: UtilsService,
    private esService: EntryStrategiesService, private exService: ExitStrategiesService, private indicators: IndicatorsService) {
    super();
  }

  /**
   * Initialisation
   */
  async ngOnInit(): Promise<void> {
    const arg = [2/*, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20*/];
    const arg2 = [0.1/*, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1*/];
    //const arg2 = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
    for (const i of arg) {
      for (const j of arg2) { // for (let j = 0; j < 30; j++) {
        this.winTrades = [];
        this.loseTrades = [];
        this.allTrades = [];

        for (const element of this.assetsArray) {
          this.data = [];
          await this.getDataFromFile(element);
          this.runBacktest(i, j);
        }
        console.log('-------------');
        console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
        //console.log('Ratio candle', i);
        //console.log('Taille petit candle', j);
        console.log('Total R:R', this.utils.round(this.loseTrades.reduce((a, b) => a + b, 0) + this.winTrades.reduce((a, b) => a + b, 0), 5));
        console.log('Avg R:R', this.utils.round(this.allTrades.reduce((a, b) => a + b, 0) / this.allTrades.length, 2));
        console.log('Winrate ' + this.utils.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) + '%');
        console.log(this.allTrades)
      }

      // }
    }
    this.initGraphProperties(this.data);
  }


  /**
   * Parse et push les donnees CSV.
   */
  getDataFromFile(devise: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/' + devise, { responseType: 'text' }).subscribe(
        (data) => {
          const csvToRowArray = data.split('\r\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split('\t'); // d, o, h, l, c, v
            this.data.push({
              date: element[0],
              open: parseFloat(element[1]),
              high: parseFloat(element[2]),
              low: parseFloat(element[3]),
              close: parseFloat(element[4])
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


  /**
   * Boucle principale avec itération de chaque bougie.
   */
  runBacktest(arg: number, arg2?: number): void {
    let inLong = false;
    let trigger = [];
    let entryPrice: any;
    let initialStopLoss: any;
    let updatedStopLoss: any;
    let takeProfit: any;
    let longTimeMarker: any;
    let time: number;
    let liquidityResult: any;
    let liquidity: any;
    this.haData = this.utils.setHeikenAshiData(this.data); // promise ?
    const rsiValues = this.indicators.rsi(this.data, 14);
    const atrValues = this.indicators.atr(this.data, 10);
    const isTimeExit = false;
    const isTrailingStopLoss = false;
    const isFixedTakeProfitAndTrailingStopLoss = false;
    const isFixedTakeProfitAndStopLoss = true;
    const isFixedTakeProfitAndBreakEvenStopLoss = false;
    const isHeikenAshi = false;

    for (let i = 100; i < this.data.length; i++) {       //for (let i = 48000; i < this.data.length; i++) {
      if (i === (this.data.length - 1)) {
        inLong = false;
      }

      if (!inLong) {

        liquidityResult = this.esService.checkLiquidity(this.data, i, atrValues);
        if (liquidityResult) {
          liquidity = liquidityResult;
        }

        const res = this.esService.strategy_LiquidityDelayed_Long(this.data, i, trigger, liquidity);
        trigger = res.trigger;
        if (res.startTrade) {
          inLong = true;
          entryPrice = res.entryPrice;
          initialStopLoss = updatedStopLoss = res.stopLoss;
          takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * arg, 5);
          longTimeMarker = this.utils.setLongTimeMarker(this.data, i);

          time = i;
          liquidity = undefined;

          if (this.logEnable) {
            console.log('---');
            console.log('Open number', i);
            console.log('Entry data', this.data[i]);
            console.log('Candle number', i);
            console.log('entryPrice', entryPrice);
            console.log('init stopLoss', initialStopLoss);
            console.log('takeProfit', this.utils.round(takeProfit, 5));
          }
        }
      }

      /*const sma = this.indicators.sma(this.data, i, 100);
      if (this.close(this.data, i, 0) > sma) {
        takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * 3, 5);
      } else {
        takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * 1, 5);
      }*/
      let rr: number;
      if (inLong) {
        if (isTimeExit) {
          rr = this.exService.timeExit(this.data, i, time, entryPrice);
        } else if (isFixedTakeProfitAndStopLoss) {
          rr = this.exService.getFixedTakeProfitAndStopLoss(this.data, i, entryPrice, initialStopLoss, takeProfit);
        } else if (isFixedTakeProfitAndBreakEvenStopLoss) {
          rr = this.exService.getFixedTakeProfitpAndBreakEvenStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit, 2);
        } else if (isTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, arg);
          rr = this.exService.getTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss);
        } else if (isFixedTakeProfitAndTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, 0.7);
          rr = this.exService.getFixeTakeProfitAndTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit);
        } else if (isHeikenAshi) {
          rr = this.exService.getHeikenAshi(this.haData, this.data, i, entryPrice, initialStopLoss);
        }

        if (rr !== undefined) {
          inLong = false;
          this.allTrades.push(rr);
          longTimeMarker.end = this.date(this.data, i, 0);
          this.timeMarkerArray.push(longTimeMarker);

          if (rr > 0) {
            this.winTrades.push(rr);
          } else if (rr < 0) {
            this.loseTrades.push(rr);
          }
        }
      }
    } // Fin i array
  }


  /**
   * Initiation des propriétés du graphique.
   */
  initGraphProperties(data: any): void {
    const finalData = data.map((res) => {
      return [res.date, res.open, res.high, res.low, res.close, res.volume];
    });

    const fusionTable = new FusionCharts.DataStore().createDataTable(finalData, this.graphService.schema);
    this.dataSourceCandle = this.graphService.dataSource;
    this.dataSourceCandle.data = fusionTable;
    this.dataSourceCandle.xAxis.timemarker = this.timeMarkerArray;

    this.dataSourceRisk = this.graphService.dataRisk;
    this.dataSourceRisk.data = this.utils.formatDataForGraphLine(this.allTrades);

    this.dataSourceInterest = this.graphService.dataInterest;
    this.dataSourceInterest.data = this.utils.composedInterest(5000, 1, this.allTrades);
  }
}

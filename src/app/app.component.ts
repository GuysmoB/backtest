import { ExitStrategiesService } from './services/exit-strategies.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { IndicatorsService } from './services/indicators.service';
import { CandleAbstract } from './abstract/candleAbstract';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';
import { stringify } from 'querystring';

// https://www.fusioncharts.com/dev/fusiontime/fusiontime-attributes
// https://www.fusioncharts.com/dev/fusiontime/getting-started/how-fusion-time-works
// https://stackblitz.com/run?file=indicator-data.ts
// https://quantiacs.com/Blog/Intro-to-Algorithmic-Trading-with-Heikin-Ashi.aspx
// https://medium.com/automated-trading/how-to-calculate-and-analyze-relative-strength-index-rsi-using-python-94420d80a364

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent extends CandleAbstract implements OnInit {

  /**
   * ## TODO ##
   * interêts composés,
   * Intégrés les courbes des R:R gagnés,
   */

  assetsArray = ['btc1_kraken.txt'];
  //assetsArray = ['AUDCHF60.csv', 'EURGBP60.csv', 'EURUSD60.csv'];
  data = [];
  haData = [];
  winTrades = [];
  loseTrades = [];
  allTrades = [];
  rsiValues: any;
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
    const arg = [5, 10 , 15, 20 , 25];
    for (const j of arg) { // for (let j = 0; j < 200; j++) {   
      this.winTrades = [];
      this.loseTrades = [];
      this.allTrades = [];

      for (const element of this.assetsArray) {
        this.data = [];
        //this.data =  await this.utils.getDataFromFile('btc1_hxro.txt');
        this.data = await this.utils.getDataFromFile('orderBook_data_firebase.txt');
        //console.log(JSON.stringify(this.data))
        //console.log(this.data)
        this.runBacktest(j);
      }
      console.log('-------------');
      console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
      console.log('RSI Value', j);
      console.log('Total R:R', this.utils.round(this.loseTrades.reduce((a, b) => a + b, 0) + this.winTrades.reduce((a, b) => a + b, 0), 2));
      console.log('Avg R:R', this.utils.round(this.allTrades.reduce((a, b) => a + b, 0) / this.allTrades.length, 2));
      console.log('Winrate ' + this.utils.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) + '%');
      console.log(this.allTrades.length);
    }

    this.initGraphProperties(this.data);
  }



  /**
   * Boucle principale avec itération de chaque bougie.
   */
  runBacktest(arg: number): void {
    let inLong = false;
    let trigger = [];
    let entryPrice: any;
    let initialStopLoss: any;
    let updatedStopLoss: any;
    let takeProfit: any;
    let longTimeMarker: any;
    this.haData = this.utils.setHeikenAshiData(this.data); // promise ?
    this.rsiValues = this.indicators.rsi(this.data, 14);

    const isTrailingStopLoss = false;
    const isFixedTakeProfitAndTrailingStopLoss = false;
    const isFixedTakeProfitAndStopLoss = false;
    const isFixedTakeProfitAndBreakEvenStopLoss = false;
    const isHeikenAshi = true;

    for (let i = 10; i < this.data.length; i++) {       // for (let i = 3809; i < 4101; i++) {
      if (i === (this.data.length - 1)) {
        inLong = false;
      }

      let rr: number;
      if (inLong) {
        if (isFixedTakeProfitAndStopLoss) {
          rr = this.exService.getFixedTakeProfitAndStopLoss(this.data, i, entryPrice, initialStopLoss, takeProfit);
        } else if (isFixedTakeProfitAndBreakEvenStopLoss) {
          rr = this.exService.getFixedTakeProfitpAndBreakEvenStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit, arg);
        } else if (isTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, 0.6); 
          rr = this.exService.getTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss);
        } else if (isFixedTakeProfitAndTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, 0.8); 
          rr = this.exService.getFixeTakeProfitAndTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit);
        } else if (isHeikenAshi) {
          rr = this.exService.getHeikenAshi(this.haData, this.data, i, entryPrice, initialStopLoss);
        }
      }

      if (rr !== undefined) {
        inLong = false;
        this.allTrades.push(rr);
        longTimeMarker.end = this.date(this.data, i, 0);
        //this.timeMarkerArray.push(longTimeMarker);

        if (rr >= 0) {
          this.winTrades.push(rr);
        } else if (rr < 0) {
          this.loseTrades.push(rr);
        }
      }

      if (!inLong) {
        const res = this.esService.strategy_HA_Long(this.haData, this.data, i, this.rsiValues, arg);
        if (res.startTrade) {
          inLong = true;
          entryPrice = res.entryPrice;
          trigger = res.trigger;
          initialStopLoss = updatedStopLoss = res.stopLoss;
          takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * arg, 5);
          longTimeMarker = this.utils.setLongTimeMarker(this.data, i);

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

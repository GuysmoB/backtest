import { ExitStrategiesService } from './services/exit-strategies.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { CandleAbstract } from './abstract/candleAbstract';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';

// https://www.fusioncharts.com/dev/fusiontime/fusiontime-attributes
// https://www.fusioncharts.com/dev/fusiontime/getting-started/how-fusion-time-works
// https://stackblitz.com/run?file=indicator-data.ts
// https://quantiacs.com/Blog/Intro-to-Algorithmic-Trading-with-Heikin-Ashi.aspx

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

  // assetsArray = ['EURGBP60.csv'];
  assetsArray = ['AUDCHF60.csv', 'EURGBP60.csv', 'EURUSD60.csv'];
  data = [];
  haData = [];
  finalData = [];
  winTrades = [];
  loseTrades = [];
  allTrades = [];
  timeMarkerArray = [];
  dataSource: any;
  type: string;
  width: string;
  height: string;
  displayChart = false;

  constructor(private http: HttpClient, private graphService: GraphService, private utils: UtilsService, private esService: EntryStrategiesService, private exService: ExitStrategiesService) {
    super();
  }

  /**
   * Initialisation
   */
  async ngOnInit(): Promise<void> {
    //const rrArray = [4, 5, 6, 7, 8, 9, 10];
    const rrArray = [0.9];
    for (const rr of rrArray) {
      this.winTrades = [];
      this.loseTrades = [];
      this.allTrades = [];

      for (const element of this.assetsArray) {
        this.data = [];
        await this.getDataFromFile(element);
        this.runBacktest(rr);
      }
      console.log('-------------');
      console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
      console.log('R:R target', rr);
      console.log('Total R:R', this.utils.round(this.loseTrades.reduce((a, b) => a + b, 0) + this.winTrades.reduce((a, b) => a + b, 0), 2));
      console.log('Avg R:R', this.utils.round(this.allTrades.reduce((a, b) => a + b, 0) / this.allTrades.length, 2));
      console.log('Winrate ' + this.utils.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) + '%');
      console.log(this.allTrades);
    }

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


  /**
   * Boucle principale avec itération de chaque bougie.
   */
  runBacktest(targetRR: number): void {
    let entryPrice: any;
    let initialStopLoss: any;
    let updatedStopLoss: any;
    let takeProfit: any;
    let longTimeMarker: any;
    this.haData = this.utils.setHeikenAshiData(this.data); // promise ?
    let inLong = false;
    const isTrailingStopLoss = true;
    const isFixedTakeProfitAndTrailingStopLoss = false;
    const isFixedTakeProfitAndStopLoss = false;
    const isFixedTakeProfitAndBreakEvenStopLoss = false;
    const isHeikenAshi = false;

    for (let i = 10; i < this.data.length; i++) {       // for (let i = 3989; i < 4101; i++) {
      if (i === (this.data.length - 1)) {
        inLong = false;
      }

      let rr: number;
      if (inLong) {
        if (isFixedTakeProfitAndStopLoss) {
          rr = this.exService.getFixedTakeProfitAndStopLoss(this.data, i, entryPrice, initialStopLoss, takeProfit);
        } else if (isFixedTakeProfitAndBreakEvenStopLoss) {
          rr = this.exService.getFixedTakeProfitpAndBreakEvenStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit, targetRR);
        } else if (isTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, targetRR);
          rr = this.exService.getTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss);
        } else if (isFixedTakeProfitAndTrailingStopLoss) {
          updatedStopLoss = this.exService.updateStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, 0.7);
          rr = this.exService.getFixeTakeProfitAndTrailingStopLoss(this.data, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit);
        } else if (isHeikenAshi) {
          rr = this.exService.getHeikenAshi(this.haData, this.data, i, entryPrice, initialStopLoss);
        }
      }

      if (rr !== undefined) {
        inLong = false;
        this.allTrades.push(rr);
        longTimeMarker.end = this.date(this.data, i, 0);
        this.timeMarkerArray.push(longTimeMarker);

        if (rr >= 0) {
          this.winTrades.push(rr);
        } else if (rr < 0) {
          this.loseTrades.push(rr);
        }
      }

      if (!inLong) {
        const res = this.esService.strategy_LSD_Long(this.data, i);
        if (res.startTrade) {
          inLong = true;
          entryPrice = res.entryPrice;
          initialStopLoss = updatedStopLoss = res.stopLoss;
          takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * targetRR, 5);
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
  initGraphProperties(): void {
    this.type = 'timeseries';
    this.width = '100%';
    this.height = '600';
    this.dataSource = this.graphService.dataSource;
    this.dataSource.xAxis.timemarker = this.timeMarkerArray;
  }
}

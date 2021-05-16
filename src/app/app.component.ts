import { IndicatorsService } from './services/indicators.service';
import { ExitStrategiesService } from './services/exit-strategies.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { CandleAbstract } from './abstract/candleAbstract';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';
import { indicatorMacd } from '@d3fc/d3fc-technical-indicator';
import { indicatorExponentialMovingAverage } from '@d3fc/d3fc-technical-indicator';

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
  allData = [];
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
    const arg = [2/*, 2, 3, 4, 5, 6, 7, 8, 9, 10*/];
    const arg2 = [0.1/*, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1*/];
    //const arg2 = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
    for (const i of arg) {
      for (const j of arg2) { // for (let j = 0; j < 30; j++) {
        this.winTrades = [];
        this.loseTrades = [];
        this.allTrades = [];

        for (const element of this.assetsArray) {
          this.allData = [];
          await this.getDataFromFile(element);
          this.runBacktest(i, j);
        }
        console.log('-------------');
        console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
        console.log('Arg', i);
        console.log('Arg2', j);
        console.log('Total R:R', this.utils.round(this.loseTrades.reduce((a, b) => a + b, 0) + this.winTrades.reduce((a, b) => a + b, 0), 5));
        console.log('Avg R:R', this.utils.round(this.allTrades.reduce((a, b) => a + b, 0) / this.allTrades.length, 2));
        console.log('Winrate ' + this.utils.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) + '%');
      }
    }
    this.initGraphProperties(this.allData);
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
            this.allData.push({
              date: element[0],
              open: parseFloat(element[1]),
              high: parseFloat(element[2]),
              low: parseFloat(element[3]),
              close: parseFloat(element[4])
            });
          }
          resolve(data);
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
    this.haData = this.utils.setHeikenAshiData(this.allData);
    const rsiValues = this.indicators.rsi(this.allData, 14);
    const atrValues = this.indicators.atr(this.allData, 10);

    const macd = indicatorMacd();
    const macdData = macd(this.allData.map(d => d.close));

    const emaTrend = indicatorExponentialMovingAverage().period(200).value(d => d.close);
    const emaTrendData = emaTrend(this.allData);

    const emaSlow = indicatorExponentialMovingAverage().period(20).value(d => d.close);
    const emaSlowData = emaSlow(this.allData);

    const emaFast = indicatorExponentialMovingAverage().period(10).value(d => d.close);
    const emaFastData = emaFast(this.allData);

    const isTimeExit = false;
    const isTrailingStopLoss = false;
    const isFixedTakeProfitAndTrailingStopLoss = false;
    const isFixedTakeProfitAndStopLoss = true;
    const isFixedTakeProfitAndBreakEvenStopLoss = false;
    const isHeikenAshi = false;
    const isPcyExit = false;

    for (let i = 200; i < this.allData.length; i++) {       //    for (let i = 48000; i < this.allData.length; i++) {
      if (i === (this.allData.length - 1)) {
        inLong = false;
      }

      /* this.findSetupOnClosedCandles('tickerTf');
      this.entryExit(i, 'tickerTf',) */
      if (!inLong) {
        /*      liquidityResult = this.esService.checkLiquidity(this.allData, i, atrValues);
             if (liquidityResult) {
               liquidity = liquidityResult;
             } */

        const res = this.esService.strategy_LiquidityDelayed_Long(this.allData, i, trigger);
        trigger = res.trigger;
        if (res.startTrade) {
          inLong = true;
          entryPrice = res.entryPrice;
          initialStopLoss = updatedStopLoss = res.stopLoss;
          takeProfit = this.utils.round(entryPrice + (entryPrice - initialStopLoss) * arg, 5);
          longTimeMarker = this.utils.setLongTimeMarker(this.allData, i);
          time = i;
          liquidity = undefined;

          if (this.logEnable) {
            console.log('---');
            console.log('Entry data', this.allData[i]);
            console.log('Candle number', i);
            console.log('entryPrice', entryPrice);
            console.log('init stopLoss', initialStopLoss);
            console.log('takeProfit', this.utils.round(takeProfit, 5));
          }
        }
      }

      let rr: number;
      if (inLong) {
        if (isTimeExit) {
          rr = this.exService.timeExit(this.allData, i, time, entryPrice);
        } else if (isFixedTakeProfitAndStopLoss) {
          rr = this.exService.getFixedTakeProfitAndStopLoss(this.allData, i, entryPrice, initialStopLoss, takeProfit);
        } else if (isFixedTakeProfitAndBreakEvenStopLoss) {
          rr = this.exService.getFixedTakeProfitpAndBreakEvenStopLoss(this.allData, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit, 2);
        } else if (isTrailingStopLoss) {
          rr = this.exService.getTrailingStopLoss(this.allData, i, entryPrice, initialStopLoss, updatedStopLoss);
          updatedStopLoss = this.exService.updateStopLoss(this.allData, i, entryPrice, initialStopLoss, updatedStopLoss, time, 0.5);
        } else if (isFixedTakeProfitAndTrailingStopLoss) {
          rr = this.exService.getFixeTakeProfitAndTrailingStopLoss(this.allData, i, entryPrice, initialStopLoss, updatedStopLoss, takeProfit);
          updatedStopLoss = this.exService.updateStopLoss(this.allData, i, entryPrice, initialStopLoss, updatedStopLoss, time, 0.7);
        } else if (isHeikenAshi) {
          rr = this.exService.getHeikenAshi(this.haData, this.allData, i, entryPrice, initialStopLoss);
        } else if (isPcyExit) {
          rr = this.exService.getPcyExit(this.allData, i, entryPrice, initialStopLoss, emaFastData, emaSlowData);
        }

        if (rr !== undefined) {
          inLong = false;
          this.allTrades.push(rr);
          longTimeMarker.end = this.date(this.allData, i, 0);
          longTimeMarker.style.marker.fill = this.utils.getColor(rr);
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
   * Recherche de setup sur les candles closes et les sauvegarde dans AllData
   */
  findSetupOnClosedCandles(tickerTf: string) {
    try {
      const data = this.allData[tickerTf].ohlc;
      const atr = this.indicators.atr(data, 10);
      const inLong = this.getDirection_Long(tickerTf);

      const isLiquidityLong = this.esService.checkLiquidity_Long(data, atr);
      if (isLiquidityLong) {
        this.setLiquidity_Long(tickerTf, isLiquidityLong);
      }

      const isLiquidityLongSetup = this.esService.strategy_LiquidityBreakout_Long(data, this.getLiquidity_Long(tickerTf));
      if (isLiquidityLongSetup) {
        this.setLiquidity_Long(tickerTf, undefined);
      }
    } catch (error) {
      console.error(error);
    }
  }


  /**
  * Execution de la stratégie principale.
  */
  entryExit(lastCandle: any, tickerTf: string) {
    let rr: number;
    const rrTarget = 2;
    const data = this.allData[tickerTf].ohlc;
    const inLong = this.getDirection_Long(tickerTf);
    const inShort = this.getDirection_Short(tickerTf);

    try {
      if (inLong) {
        //rr = this.exService.getFixedTakeProfitAndStopLoss('LONG', this.getTickerTfData(tickerTf), lastCandle);
        this.updateResults('LONG', rr, tickerTf);
      } else {
        const res = this.esService.trigger_EngulfingRetested_Long(this.getSnapshot_Long(tickerTf), lastCandle);
        if (res) {
          const date = this.utils.getDate();
          this.setDirection_Long(tickerTf, true);
          this.setSnapshotCanceled_Long(tickerTf, true);
          this.setEntryTime_Long(tickerTf, date);
          this.setEntryPrice_Long(tickerTf, this.utils.round(res.entryPrice, 5));
          this.setStopLoss_Long(tickerTf, this.utils.round(res.stopLoss, 5));
          this.setTakeProfit_Long(tickerTf, this.utils.round(res.entryPrice + (res.entryPrice - res.stopLoss) * rrTarget, 5));

          if (this.logEnable) {
            console.log('--------');
            console.log('Long', tickerTf);
            console.log('entryPrice', this.getEntryPrice_Long(tickerTf));
            console.log('stopLoss', this.getStopLoss_Long(tickerTf));
            console.log('takeProfit', this.getTakeProfit_Long(tickerTf));
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }


  /**
 * Update trades's state, global R:R and log.
 */
  updateResults(direction: string, rr: number, tickerTf: any) {
    try {
      if (rr !== undefined) {
        this.allTrades.push(rr);
        if (rr >= 0) {
          this.winTrades.push(rr);
        } else if (rr < 0) {
          this.loseTrades.push(rr);
        }

        if (direction === 'LONG') {
          this.setDirection_Long(tickerTf, false);
        } else if (direction === 'SHORT') {
          this.setDirection_Short(tickerTf, false);
        } else {
          console.error('Long or short ?');
        }

        console.log('-------------------------');
        console.log('---- UPDATED RESULTS ----');
        console.log('-------------------------');
        console.log('Last R:R', rr);
        console.log(direction, tickerTf, this.utils.getDate());
        console.log('Trades : Gagnes / Perdus / Total', this.winTrades.length, this.loseTrades.length, this.winTrades.length + this.loseTrades.length);
        console.log('Total R:R', this.utils.round(this.loseTrades.reduce((a, b) => a + b, 0) + this.winTrades.reduce((a, b) => a + b, 0), 2));
        console.log('Avg R:R', this.utils.round(this.allTrades.reduce((a, b) => a + b, 0) / this.allTrades.length, 2));
        console.log('Winrate ' + this.utils.round((this.winTrades.length / (this.loseTrades.length + this.winTrades.length)) * 100, 2) + '%');
      }
    } catch (error) {
      throw error;
    }
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



  /**
   * GETTER / SETTER
   */
  getLiquidity_Long(tickerTf: any) {
    return this.allData[tickerTf].liquidity_Long;
  }
  getTickerTfData(tickerTf: any) {
    return this.allData[tickerTf];
  }
  getDirection_Long(tickerTf: any) {
    return this.allData[tickerTf].inLong;
  }
  getEntryPrice_Long(tickerTf: any) {
    return this.allData[tickerTf].entryPrice_Long;
  }
  getStopLoss_Long(tickerTf: any) {
    return this.allData[tickerTf].initialStopLoss_Long;
  }
  getTakeProfit_Long(tickerTf: any) {
    return this.allData[tickerTf].takeProfit_Long;
  }
  getSnapshot_Long(tickerTf: any) {
    return this.allData[tickerTf].snapshot_Long;
  }

  setLiquidity_Long(tickerTf: any, value: any) {
    this.allData[tickerTf].liquidity_Long = value;
  }
  setEntryTime_Long(tickerTf: any, value: any) {
    this.allData[tickerTf].entryTime_Long = value;
  }
  setSnapshot_Long(tickerTf: any, value: any) {
    this.allData[tickerTf].snapshot_Long = value;
  }
  setSnapshotCanceled_Long(tickerTf: any, value: boolean) {
    this.allData[tickerTf].snapshot_Long.canceled = value;
  }
  setDirection_Long(tickerTf: any, value: boolean) {
    this.allData[tickerTf].inLong = value;
  }
  setEntryPrice_Long(tickerTf: any, value: number) {
    this.allData[tickerTf].entryPrice_Long = value;
  }
  setStopLoss_Long(tickerTf: any, value: number) {
    this.allData[tickerTf].initialStopLoss_Long = value;
  }
  setTakeProfit_Long(tickerTf: any, value: number) {
    this.allData[tickerTf].takeProfit_Long = value;
  }


  getLiquidity_Short(tickerTf: any) {
    return this.allData[tickerTf].liquidity_Short;
  }
  getDirection_Short(tickerTf: any) {
    return this.allData[tickerTf].inShort;
  }
  getEntryPrice_Short(tickerTf: any) {
    return this.allData[tickerTf].entryPrice_Short;
  }
  getStopLoss_Short(tickerTf: any) {
    return this.allData[tickerTf].initialStopLoss_Short;
  }
  getTakeProfit_Short(tickerTf: any) {
    return this.allData[tickerTf].takeProfit_Short;
  }
  getSnapshot_Short(tickerTf: any) {
    return this.allData[tickerTf].snapshot_Short;
  }

  setLiquidity_Short(tickerTf: any, value: any) {
    this.allData[tickerTf].liquidity_Short = value;
  }
  setEntryTime_Short(tickerTf: any, value: any) {
    this.allData[tickerTf].entryTime_Short = value;
  }
  setSnapshot_Short(tickerTf: any, value: any) {
    this.allData[tickerTf].snapshot_Short = value;
  }
  setSnapshotCanceled_Short(tickerTf: any, value: boolean) {
    this.allData[tickerTf].snapshot_Short.canceled = value;
  }
  setDirection_Short(tickerTf: any, value: boolean) {
    this.allData[tickerTf].inShort = value;
  }
  setEntryPrice_Short(tickerTf: any, value: number) {
    this.allData[tickerTf].entryPrice_Short = value;
  }
  setStopLoss_Short(tickerTf: any, value: number) {
    this.allData[tickerTf].initialStopLoss_Short = value;
  }
  setTakeProfit_Short(tickerTf: any, value: number) {
    this.allData[tickerTf].takeProfit_Short = value;
  }
}

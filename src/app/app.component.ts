import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';

//https://www.fusioncharts.com/dev/fusiontime/fusiontime-attributes

const schema = [
  {
    name: "Date",
    type: "date",
    format: "%Y-%m-%d %H:%M"
  },
  {
    name: "Open",
    type: "number"
  },
  {
    name: "High",
    type: "number"
  },
  {
    name: "Low",
    type: "number"
  },
  {
    name: "Close",
    type: "number"
  },
  {
    name: "Volume",
    type: "number"
  }
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {

  data = [];
  winTrades = [];
  loseTrades = [];
  candleArray = [];
  final_data = [];
  dataSource: any;
  type: string;
  width: string;
  height: string;
  inTrade = false;

  constructor(private http: HttpClient) {
    this.type = 'timeseries';
    this.width = '100%';
    this.height = '400';
    this.dataSource = {
    
      navigator: {
        enabled: false,
      },
      chart: {
        theme: "candy"
      },
      caption: {
        text: "Apple Inc. Stock Price"
      },
      data: null,
      yaxis: [
        {
          plot: {
            value: {
              open: "Open",
              high: "High",
              low: "Low",
              close: "Close",
              volume: "Volume"
            },
            type: "candlestick"
          },
          format: {
            prefix: "$"
          },
          title: "Stock Value"
        }
      ]
    };
  }


  async ngOnInit() {
      await this.getDataFromFile();
      this.runBacktest();
  }


  getDataFromFile() {
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/EURUSD60.csv', { responseType: 'text' }).subscribe(
        (data) => {
          let csvToRowArray = data.split('\r\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split('\t'); // d, o, h, l, c, v
            const date = element[0].split(" ")[0];
            this.data.push({
              date: element[0], 
                open: parseFloat(element[1]),
                high: parseFloat(element[2]),
                low: parseFloat(element[3]),
                close: parseFloat(element[4]),
                volume: parseFloat(element[5])
            });
          }
          
          this.final_data = this.data.map((res) => {
            return [
              res.date,
              res.open,
              res.high,
              res.low,
              res.close,
              res.volume
            ];
          });
          
          const fusionTable = new FusionCharts.DataStore().createDataTable(this.final_data, schema);
          this.dataSource.data = fusionTable;
          resolve();
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      );
    });  
  }


  runBacktest() {
    let buyPrice: any;
    let stopPrice: any;
    let profitPrice: any;
    console.log("data length", this.data.length);
    
    for (let i = 10; i < this.data.length; i++){
      if (this.inTrade) {
        if (this.low(i, 0) <= stopPrice) {
          this.inTrade = false;
          this.loseTrades.push(-1);
          console.log("SL", this.data[i]);
        }
      }

      if (this.inTrade) {
        if (this.high(i, 0) >= profitPrice) {
          this.inTrade = false;
          this.winTrades.push(2);
          console.log("TP", this.data[i]);
        }
      }
      
      if (!this.inTrade) {
        if (this.strategy_LSD(i)) {
          this.inTrade = true;
          buyPrice = this.close(i, 0);
          stopPrice = this.low(i, 0);
          profitPrice = buyPrice + (buyPrice - stopPrice) * 2;
          console.log("-------------");
          console.log("Candle", this.data[i]);
          console.log("buyPrice", buyPrice);
          console.log("stopPrice", stopPrice);
          console.log("profitPrice", this.round(profitPrice, 5));
        }
      }
    }
    console.log("Number of trades", this.loseTrades.length + this.winTrades.length);
    console.log("Total R:R", this.getTotalWin(this.loseTrades) + this.getTotalWin(this.winTrades));
    console.log("Winrate %", this.round(this.loseTrades.length / (this.loseTrades.length + this.winTrades.length), 2));
  }




  strategy_test(i: number) {
    return this.close(i, 1) > this.open(i, 1) && this.close(i, 0) > this.open(i, 0);
  }


  strategy_LSD(i: number) {
    const lookback = 3;
    const swingHigh = this.highest(i-1, "high", lookback);
    const swingLow = this.lowest(i-1, "low", lookback);
    const liquidityPips = (swingHigh - swingLow) / 5;
    //console.log("swinghigh", swingHigh);
    //console.log("swinglow", swingLow);
    //console.log("low", this.low(i, 0));
    //console.log("liquidity pips", liquidityPips);
    const liquidityLow_OneCandle = this.isUp(i, 0) && this.low(i, 0) < swingLow;
    const breakoutUp = this.close(i, 0) > swingHigh;

    return liquidityLow_OneCandle && breakoutUp;
  }


  /**
   * Retourne la valeur maximale en fonction de la source et de lookback
   */
  highest(index: number, source: string, lookback: number) {
    let max: number;

    for (let k = 0; k < lookback; k++) {
      if (k == 0) {
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
  lowest(index: number, source: string, lookback: number) {
    let min: number;

    for (let k = 0; k < lookback; k++) {
      if (k == 0) {
        min = this.data[index - k][source];
      }

      if (this.data[index - k][source] < min) {
        min = this.data[index - k][source];
      }
    }
    return min;
  }


  isUp(index: number, lookback: number) {
    return (this.data[index - lookback].close > this.data[index - lookback].open);
  }

  open(index: number, lookback: number) {
    return this.data[index - lookback].open;
  }

  close(index: number, lookback: number) {
    return this.data[index - lookback].close;
  }

  high(index: number, lookback: number) {
    return this.data[index - lookback].high;
  }

  low(index: number, lookback: number) {
    return this.data[index - lookback].low;
  }

  date(index: number, lookback: number) {
    return this.data[index - lookback].date;
  }

  volume(index: number, lookback: number) {
    return this.data[index - lookback].volume;
  }


  getTotalWin(result: any[]) {
    let total = 0;
    result.forEach(element => {
      total += element;
    });

    return total;
  }

    /**
     * Arrondi un nombre avec une certaine précision.
     */
    round(value: number, precision: number) {
      const multiplier = Math.pow(10, precision || 0);
      return Math.round(value * multiplier) / multiplier;
  }

}

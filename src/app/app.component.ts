import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as FusionCharts from 'fusioncharts';


//https://github.com/apexcharts/ng-apexcharts
//https://apexcharts.com/angular-chart-demos/candlestick-charts/basic/


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {

  data = [];
  results= [];
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
      caption: {
        text: 'Apple Inc. Stock Price',
      },
      subcaption: {
        text: 'Stock prices from May 2014 - November 2018',
      },
      chart: {
        exportenabled: 1,
        multicanvas: false,
        theme: 'umber',
      },
      yaxis: [
        {
          plot: [
            {
              value: {
                open: 'Open',
                high: 'High',
                low: 'Low',
                close: 'Close',
              },
              type: 'candlestick',
            },
          ],
          format: {
            prefix: '$',
          },
          title: 'Stock Price',
        },
      ],
      datamarker: [
        {
          value: 'Open',
          time: '08-Feb-2018',
          type: 'pin',
          identifier: 'L',
          timeformat: '%d-%b-%Y',
          tooltext: 'Lowest close value - 2018',
        },
        {
          value: 'Volume',
          time: '14-Sep-2016',
          type: 'pin',
          identifier: 'H',
          timeformat: '%d-%b-%Y',
          tooltext: 'Over 110 M shares were traded.',
        },
      ],
      xaxis: {
        plot: 'Time',
        timemarker: [
          {
            start: '08-Feb-2018',
            end: '03-Jan-2017',
            label: 'Growing era of Apple Inc. stock',
            timeformat: '%d-%b-%Y',
            type: 'full',
          },
        ],
      },
      navigator: {
        enabled: 0,
      },
    };

    //this.fetchData();
  }


  async ngOnInit() {
    await this.getDataFromFile();
    this.setStrategy();
  }


  fetchData() {
    var jsonify = (res) => res.json();
    let  dataFetch = fetch(
      'https://s3.eu-central-1.amazonaws.com/fusion.store/ft/data/annotations-on-stock-chart_data.json'
    ).then(jsonify); 

    let schemaFetch = fetch(
      'https://s3.eu-central-1.amazonaws.com/fusion.store/ft/schema/annotations-on-stock-chart_schema.json'
    ).then(jsonify);


    Promise.all([dataFetch, schemaFetch]).then((res) => {
      const [data, schema] = res;
      const fusionDataStore = new FusionCharts.DataStore();
      console.log("my data : " +this.data)
      const fusionTable = fusionDataStore.createDataTable(this.data, schema);      
      this.dataSource.data = fusionTable;
    });
  }


  getDataFromFile() {
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/EURUSD1440_short.csv', { responseType: 'text' }).subscribe(
        (data) => {
          let csvToRowArray = data.split('\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split('\t');
            const date = element[0].split(" ")[0];

            this.data.push({
                date: date, 
                open: parseFloat(element[1]),
                high: parseFloat(element[2]),
                low: parseFloat(element[3]),
                close: parseFloat(element[4]),
                volume: parseFloat(element[5])
              });
          }
          //console.table(this.data);
          //console.log(this.data);
          resolve();
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      );
    });  
  }


  setStrategy() {
    console.log("data length", this.data.length);
    
    for (let i = 10; i < this.data.length; i++){
      //console.log("data", this.data[i]);
      let buyPrice: any;
      let stopPrice: any;
      let profitPrice: any;
      
      if (this.inTrade) {
        if (this.low(i, 0) < stopPrice) {
          this.inTrade = false;
          this.results.push(-1);
          console.log("SL", this.data[i]);
        }

        if (this.high(i, 0) > profitPrice) {
          this.inTrade = false;
          this.results.push(2);
          console.log("TP", this.data[i]);
        }
      }

      if (this.close(i, 0) > this.open(i, 0) && this.close(i, 1) > this.open(i, 1)) {
        if (!this.inTrade) {
          this.inTrade = true;
          buyPrice = this.close(i, 0);
          stopPrice = this.low(i, 0);
          profitPrice = buyPrice + (buyPrice - stopPrice) * 2;
          console.log("Buy", this.data[i]);
          console.log("buyPrice", buyPrice);
          console.log("stopPrice", stopPrice);
          console.log("profitPrice", profitPrice);
        }
        

        //this.results.push({        })
      }
      
    }
  }

  enterLong() {
    
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


    /**
     * Arrondi un nombre avec une certaine précision.
     * @param value 
     * @param precision 
     */
    round(value: number, precision: number) {
      const multiplier = Math.pow(10, precision || 0);
      return Math.round(value * multiplier) / multiplier;
  }

}




/*
 let donnee = [
        [
          "2012-08-28",  
          18.74,
          19.16,
          18.67,
          18.99,
          4991285
        ],
        [
          "2012-08-29",    
          23.97,
          23.99,
          23.14,
          23.32,
          4879546
        ]
    ];

    */
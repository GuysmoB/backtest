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
  dataSource: any;
  type: string;
  width: string;
  height: string;

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

    this.fetchData();
  }

  ngOnInit() {
    this.http
      .get('assets/EURUSD1440_short.csv', { responseType: 'text' })
      .subscribe(
        (data) => {
          let csvToRowArray = data.split('\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split('\t');
            const date = element[0].split(" ")[0].toString();
            this.data.push(date, element[1], element[2], element[3], element[4], 0);
            //this.data.push("2014-07-15","96.800003","96.849998","95.029999","95.32","45477900");
          }
          console.table(JSON.stringify(this.data));
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // In this method we will create our DataStore and using that we will create a custom DataTable which takes two
  // parameters, one is data another is schema.
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

      //console.log("original data : " +data)
      console.log("my data : " +this.data)

     


      const fusionTable = fusionDataStore.createDataTable(this.data, schema);
      // Afet that we simply mutated our timeseries datasource by attaching the above
      // DataTable into its data property.
      
      this.dataSource.data = fusionTable;
    });
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
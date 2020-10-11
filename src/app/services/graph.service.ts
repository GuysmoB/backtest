import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  schema = [
    {
      name: 'Date',
      type: 'date',
      format: '%Y-%m-%d %H:%M'
    },
    {
      name: 'Open',
      type: 'number'
    },
    {
      name: 'High',
      type: 'number'
    },
    {
      name: 'Low',
      type: 'number'
    },
    {
      name: 'Close',
      type: 'number'
    },
    {
      name: 'Volume',
      type: 'number'
    }
  ];

  dataSource = {
    navigator: {
      enabled: false,
    },
    chart: {
      theme: 'candy'
    },
    data: null,
    xAxis: {
      plot: 'Time',
      timemarker: [],
    },
    yaxis: [
      {
        plot: {
          value: {
            open: 'Open',
            high: 'High',
            low: 'Low',
            close: 'Close',
          },
          type: 'candlestick'
        },
        format: {
          prefix: '$'
        },
        title: 'Stock Value'
      }
    ]
  };


  constructor() { }
}

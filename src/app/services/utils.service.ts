import { getLocaleTimeFormat } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CandleAbstract } from '../abstract/candleAbstract';
import { AngularFireDatabase } from '@angular/fire/database';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UtilsService extends CandleAbstract {

  constructor(private http: HttpClient, private db: AngularFireDatabase) { 
    super();
  }

  subscription: Subscription;
  
  /**
   * Parse et push les donnees CSV.
   */
   /* getDataFromFile(devise: string): Promise<any> {
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
  } */


   /**
   * Get data from Firebase
   */
    getDataFromFirebase(path: string): Promise<any> {
      return new Promise<any>((resolve, reject) => {
        this.subscription = this.db
          .list(path)
          .valueChanges()
          .subscribe(
            (snapshot: any) => {
              this.subscription.unsubscribe();
              snapshot.map(element => {
              element.date = this.getDateFormat(element.time);
            })
            resolve(snapshot);
            },
            (error) => {
              console.log(error);
              reject(error);
            }
          );
      });
    }

    /**
   * Parse et push les donnees CSV.
   */
     getDataFromFile(file: string): Promise<any> {
      let allData = [];
      return new Promise<any>((resolve, reject) => {
        this.http.get('assets/' + file, { responseType: 'text' }).subscribe(
          (data) => {
            const object = JSON.parse(data);
            object.map(element => {
              element.date = this.getDateFormat(element.date);
            })
            resolve(object);
          },
          (error) => {
            console.log(error);
            reject(error);
          }
        );
      });
    }


  /**
   * Parse et push les donnees CSV.
   */
   getDataFromTxt(file: string): Promise<any> {
    let allData = [];
    return new Promise<any>((resolve, reject) => {
      this.http.get('assets/' + file, { responseType: 'text' }).subscribe(
        (data) => {
          const csvToRowArray = data.split('\r\n');
          for (let index = 1; index < csvToRowArray.length - 1; index++) {
            const element = csvToRowArray[index].split(','); // d, o, h, l, c, v
            allData.push({
              date: this.getDateFormat(+(element[0] + '000')),
              open: +parseFloat(element[1]),
              high: +parseFloat(element[2]),
              low: +parseFloat(element[3]),
              close: +parseFloat(element[4])
            });
          }
          resolve(allData);
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      );
    });
  }
  

  /**
   * Retourne la valeur maximale en fonction de la source et de lookback
   */
  highest(data: any, index: number, source: string, lookback: number): number {
    let max: number;

    for (let k = 0; k < lookback; k++) {
      if (k === 0) {
        max = data[index - k][source];
      }

      if (data[index - k][source] > max) {
        max = data[index - k][source];
      }
    }
    return max;
  }


  /**
   * Retourne la valeur minimale en fonction de la source et de lookback
   */
  lowest(data: any, index: number, source: string, lookback: number): number {
    let min: number;

    for (let k = 0; k < lookback; k++) {
      if (k === 0) {
        min = data[index - k][source];
      }

      if (data[index - k][source] < min) {
        min = data[index - k][source];
      }
    }
    return min;
  }


  /**
   * Arrondi un nombre avec une certaine précision.
   */
  round(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }


/**
   * Retourne l'équivalent HeikenAshi
   */
 setHeikenAshiData(source: any): any {
  const result = [];

  for (let j = 0; j < source.length; j++) {
    if (j === 0) {
      const $close = this.round((source[j].open + source[j].high + source[j].low + source[j].close) / 4, 5);
      const $open = this.round((source[j].open + source[j].close) / 2, 5);
      result.push({
        close: $close,
        open: $open,
        low: source[j].low,
        high: source[j].high,
        bull: $close > $open,
        bear: $close < $open,
        time: source[j].time
      });
    } else {
      const $close = (source[j].open + source[j].high + source[j].low + source[j].close) / 4;
      const $open = (result[result.length - 1].open + result[result.length - 1].close) / 2;
      result.push({
        close: this.round($close, 5),
        open: this.round($open, 5),
        low: this.round(Math.min(source[j].low, Math.max($open, $close)), 5),
        high: this.round(Math.max(source[j].high, Math.max($open, $close)), 5),
        bull: $close > $open,
        bear: $close < $open,
        time: source[j].time
      });
    }
  }
  return result;
}


  /**
   * Permet de retourner le R:R
   */
  getRiskReward(entryPrice: number, initialStopLoss: number, closedPrice: number): number {
    let result = this.round((closedPrice - entryPrice) / (entryPrice - initialStopLoss), 2);

    if (result == -0) {
      result = 0;
    }

    return result;
  }

    /**
    * Retourne la date avec décalage horaire. '%Y-%m-%d %H:%M'
    */
     getDateFormat(timestamp: any): any {
      let date = new Date(timestamp);
      const year = date.getFullYear();
      const month = '0' + (date.getMonth() + 1);
      const day = '0' + date.getDate();
      const hours = '0' + date.getHours();
      const minutes = '0' + date.getMinutes();
      return year + '-' + month.substr(-2) + '-' + day.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2);
    }

    

  /**
   * Set les timemarker puis indiquer la fin des trades sur le graph
   */
  setLongTimeMarker(data: any, i: number): any {
    return {
      start: this.date(data, i, 0),
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


  /**
   * Retourne un tableau avec la somme des R:R pour le graph line
   */
  formatDataForGraphLine(data: any): any {
    const result = [];

    for (let i = 0; i < data.length; i++) {
      if (result.length === 0) {
        result.push({ label: i, value: data[i] });
      } else {
        const toAdd = result[result.length - 1].value;
        result.push({ label: i, value: data[i] + toAdd });
      }
    }
    return result;
  }


  composedInterest(startingCash: number, prRisk: number, allTrades: any): any {
    const result = [];
    let cash: number;
    let moneyRisk: number;

    if (!cash) {
      cash = startingCash;
    }

    for (let i = 0; i < allTrades.length; i++) {
      moneyRisk = cash * (prRisk / 100);
      const rr = allTrades[i];
      cash += rr * moneyRisk;
      result.push({ label: i, value: this.round(cash, 2) });
    }

    return result;
  }


  sma(data: any, index: number, periode: number): number {
    const result = [];
    const dataStart = index - periode;

    if (dataStart > 0) {
      for (let i = dataStart; i < index; i++) {
        result.push(data[i].close);
      }
      return this.round(result.reduce((a, b) => a + b, 0) / result.length, 5);
    } else {
      return 0;
    }
    
  }
}

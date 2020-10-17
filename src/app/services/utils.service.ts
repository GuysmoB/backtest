import { Injectable } from '@angular/core';
import { CandleAbstract } from '../abstract/candleAbstract';

@Injectable({
  providedIn: 'root'
})
export class UtilsService extends CandleAbstract {

  constructor() {
    super();
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
        result.push({
          close: this.round((source[j].open + source[j].high + source[j].low + source[j].close) / 4, 5),
          open: this.round((source[j].open + source[j].close) / 2, 5),
          low: source[j].low,
          high: source[j].high
        });
      } else {
        const haCloseVar = (source[j].open + source[j].high + source[j].low + source[j].close) / 4;
        const haOpenVar = (result[result.length - 1].open + result[result.length - 1].close) / 2;
        result.push({
          close: this.round(haCloseVar, 5),
          open: this.round(haOpenVar, 5),
          low: this.round(Math.min(source[j].low, Math.max(haOpenVar, haCloseVar)), 5),
          high: this.round(Math.max(source[j].high, Math.max(haOpenVar, haCloseVar)), 5)
        });
      }
    }
    return result;
  }


  /**
   * Permet de retourner le R:R
   */
  getRiskRewardSL(updatedStopLoss: number, entryPrice: number, initialStopLoss: number): number {
    return this.round((updatedStopLoss - entryPrice) / (entryPrice - initialStopLoss), 2);
  }

  getRiskRewardTP(entryPrice: number, initialStopLoss: number, takeProfit: number): number {
    return this.round((takeProfit - entryPrice) / (entryPrice - initialStopLoss), 2);
  }


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

}

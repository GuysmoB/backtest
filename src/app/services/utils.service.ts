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
  getRiskReward(entryPrice: number, initialStopLoss: number, closedPrice: number): number {
    const result = this.round((closedPrice - entryPrice) / (entryPrice - initialStopLoss), 2);
    if (isNaN(result)) {
      return -1;
    } else {
      return result;
    }
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

  smaRsi(data: any, index: number, periode: number): number {
    const result = [];
    const dataStart = index - periode;

    if (dataStart > 0) {
      for (let i = dataStart; i < index; i++) {
        result.push(data[i]);
      }
      return this.round(result.reduce((a, b) => a + b, 0) / result.length, 5);
    } else {
      return 0;
    }
  }

  mean(series: Array<number>) {
    let sum = 0;
    for (let i = 0; i < series.length; i++) {
      sum += series[i];
    }
    return sum / series.length;
  }

  ema(series: Array<number>, window: number, start?: number) {
    const weight = 2 / (window + 1);
    const ema = [start ? start : this.mean(series.slice(0, window))];
    for (let i = 1, len = series.length; i < len; i++) {
      ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
    }
    return ema;
  }

  pointwise(operation: Function, ...serieses: Array<Array<number>>) {
    const result = [];
    for (let i = 0, len = serieses[0].length; i < len; i++) {
      const iseries = (i: number) => serieses.map(x => x[i]);
      result[i] = operation(...iseries(i));
    }
    return result;
  }

  rsi(candlesticks: any, window: number) {
    const $close = [];
    for (let j = 0; j < candlesticks.length; j++) {
      $close.push(candlesticks[j].close);
    }

    const gains = [0];
    const loss = [1e-14];
    for (let i = 1, len = $close.length; i < len; i++) {
      const diff = $close[i] - $close[i - 1];
      gains.push(diff >= 0 ? diff : 0);
      loss.push(diff < 0 ? -diff : 0);
    }
    const emaGains = this.ema(gains, 2 * window - 1);
    const emaLoss = this.ema(loss, 2 * window - 1);
    //return (100 - 100 / (1 + emaGains / emaLoss));
    return this.pointwise((a: number, b: number) => 100 - 100 / (1 + a / b), this.ema(gains, 2 * window - 1), this.ema(loss, 2 * window - 1));
  }
}

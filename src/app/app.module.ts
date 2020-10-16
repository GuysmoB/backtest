import { GraphService } from './services/graph.service';
import { StrategiesService } from './services/strategies.service';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';

// FusionChart
import { FusionChartsModule } from 'angular-fusioncharts';
import * as FusionCharts from 'fusioncharts';
import * as Charts from 'fusioncharts/fusioncharts.charts';
import * as FusionTheme from 'fusioncharts/themes/fusioncharts.theme.fusion';
import * as TimeSeries from 'fusioncharts/fusioncharts.timeseries';
import * as Candy from "fusioncharts/themes/fusioncharts.theme.candy";
import { StockChartAllModule, ChartAnnotationService, RangeNavigatorAllModule, ChartAllModule } from '@syncfusion/ej2-angular-charts';

FusionChartsModule.fcRoot(FusionCharts, Charts, FusionTheme, TimeSeries, Candy);

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    FusionChartsModule,
    StockChartAllModule, RangeNavigatorAllModule, ChartAllModule,
  ],
  providers: [GraphService, StrategiesService],
  bootstrap: [AppComponent]
})
export class AppModule { }

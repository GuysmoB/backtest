import { IndicatorsService } from './services/indicators.service';
import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
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
import * as Candy from 'fusioncharts/themes/fusioncharts.theme.candy';



FusionChartsModule.fcRoot(FusionCharts, Charts, FusionTheme, TimeSeries, Candy);

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    FusionChartsModule,
  ],
  providers: [GraphService, EntryStrategiesService, UtilsService, IndicatorsService],
  bootstrap: [AppComponent]
})
export class AppModule { }

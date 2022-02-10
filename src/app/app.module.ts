import { UtilsService } from './services/utils.service';
import { GraphService } from './services/graph.service';
import { EntryStrategiesService } from './services/entry-strategies.service';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire';

// FusionChart
import { FusionChartsModule } from 'angular-fusioncharts';
import * as FusionCharts from 'fusioncharts';
import * as Charts from 'fusioncharts/fusioncharts.charts';
import * as FusionTheme from 'fusioncharts/themes/fusioncharts.theme.fusion';
import * as TimeSeries from 'fusioncharts/fusioncharts.timeseries';
import * as Candy from 'fusioncharts/themes/fusioncharts.theme.candy';



FusionChartsModule.fcRoot(FusionCharts, Charts, FusionTheme, TimeSeries, Candy);
const firebaseConfig = {
  apiKey: 'AIzaSyAn1Jn7J-vumyC-XL1LY7AJEq7R_oqUGdc',
  authDomain: 'real-time-trading-bot.firebaseapp.com',
  databaseURL: 'https://real-time-trading-bot.firebaseio.com',
  projectId: 'real-time-trading-bot',
  storageBucket: 'real-time-trading-bot.appspot.com',
  messagingSenderId: '711877653368',
  appId: '1:711877653368:web:5c5e1ebab700ab23624e8d',
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    FusionChartsModule,
    AngularFireModule.initializeApp(firebaseConfig)
  ],
  providers: [GraphService, EntryStrategiesService, UtilsService],
  bootstrap: [AppComponent]
})
export class AppModule { }

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",             
  "sap/ui/core/format/DateFormat",  
  "sap/m/MessageBox",               
  "sap/viz/ui5/controls/VizFrame",  
  "sap/viz/ui5/data/FlattenedDataset", 
  "sap/viz/ui5/controls/common/feeds/FeedItem" 
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox, VizFrame, FlattenedDataset, FeedItem) { 
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Inversions", {

      _oResourceBundle: null,
      _bSidebarExpanded: true, 
      _sSidebarOriginalSize: "380px", 

      onInit: function() {
          // 1. Modelo para los símbolos (datos estáticos por ahora)
          this._initSymbolModel();
          
          // 2. Modelo para la tabla (vacío)
          this.getView().setModel(new JSONModel({
            value: [] 
        }), "priceData");

          // 3. Configurar gráfica
          this.getView().addEventDelegate({
            onAfterRendering: this._onViewAfterRendering.bind(this)
        });

          // Inicializar el modelo de análisis (tus cambios)
          var oStrategyAnalysisModelData = {
              strategyKey: "",
              longSMA: 200,
              shortSMA: 50,
              startDate: null,
              endDate: null,
              controlsVisible: false,
              strategies: [
                  { key: "", text: "Cargando textos..." },
                  { key: "MACrossover", text: "Cargando textos..." }
              ]
          };
          var oStrategyAnalysisModel = new JSONModel(oStrategyAnalysisModelData);
          this.getView().setModel(oStrategyAnalysisModel, "strategyAnalysisModel");

          //Inicialización modelo de resultados
          var oStrategyResultModel = new JSONModel({
              hasResults: false,
              idSimulation: null,
              signal: null,
              date_from: null,
              date_to: null,
              moving_averages: { short: null, long: null },
              signals: [],
              chart_data: {},
              result: null
          });
          this.getView().setModel(oStrategyResultModel, "strategyResultModel");
          
          this._setDefaultDates(); // Tus cambios

          // Cargar el ResourceBundle asíncronamente (tus cambios)
          var oI18nModel = this.getOwnerComponent().getModel("i18n");
          if (oI18nModel) {
              var oResourceBundlePromise = oI18nModel.getResourceBundle();
              oResourceBundlePromise.then(function(oLoadedBundle) {
                  console.log("Promesa del ResourceBundle resuelta. Bundle:", oLoadedBundle);
                  if (oLoadedBundle && typeof oLoadedBundle.getText === 'function') {
                      this._oResourceBundle = oLoadedBundle;
                      oStrategyAnalysisModel.setProperty("/strategies", [
                          { key: "", text: this._oResourceBundle.getText("selectStrategyPlaceholder") },
                          { key: "MACrossover", text: this._oResourceBundle.getText("movingAverageCrossoverStrategy") }
                      ]);
                      console.log("Textos de i18n cargados en el modelo de estrategias.");
                  } else {
                      oStrategyAnalysisModel.setProperty("/strategies", [
                          { key: "", text: "Error i18n: Seleccione..." },
                          { key: "MACrossover", text: "Error i18n: Cruce Medias..." }
                      ]);
                  }
              }.bind(this)).catch(function(error) {
                  console.error("Error al resolver la Promesa del ResourceBundle:", error);
                  oStrategyAnalysisModel.setProperty("/strategies", [
                      { key: "", text: "Error Promesa i18n: Seleccione..." },
                      { key: "MACrossover", text: "Error Promesa i18n: Cruce Medias..." }
                  ]);
              });
          } else {
              console.error("Modelo i18n no encontrado. Usando textos por defecto.");
              oStrategyAnalysisModel.setProperty("/strategies", [
                  { key: "", text: "No i18n: Seleccione..." },
                  { key: "MACrossover", text: "No i18n: Cruce Medias..." }
              ]);
          }

          // Para el tamaño del Sidebar (tus cambios)
          var oSidebarLayoutData = this.byId("sidebarLayoutData");
          if (oSidebarLayoutData) {
              this._sSidebarOriginalSize = oSidebarLayoutData.getSize();
          } else {
              var oSidebarVBox = this.byId("sidebarVBox");
              if (oSidebarVBox && oSidebarVBox.getLayoutData()) {
                  this._sSidebarOriginalSize = oSidebarVBox.getLayoutData().getSize();
              }
          }
      },

      _onViewAfterRendering: function() {
            this._configureChart();
        },

      _initSymbolModel: function() {
        const oSymbolModel = new JSONModel({
          symbols: [
            { symbol: "TSLA", name: "Tesla" },
            { symbol: "AAPL", name: "Apple" },
            { symbol: "MSFT", name: "Microsoft" }
          ]
        });
        this.getView().setModel(oSymbolModel, "symbolModel");
      },

      onSymbolChange: function(oEvent) {
        const sSymbol = oEvent.getSource().getSelectedKey();
        this._loadPriceData(sSymbol).then(aData => {
            const oPriceModel = this.getView().getModel("priceData");
            oPriceModel.setProperty("/originalValue", aData); // Guarda los datos originales
            oPriceModel.setProperty("/value", aData); // Muestra los datos en la gráfica
        }).catch(error => {
            console.error("Error al cargar los datos del símbolo:", error.message);
        });
    },

      _loadPriceData: function(sSymbol) {
        const oView = this.getView();
        const oPriceModel = oView.getModel("priceData");
        const oPage = this.byId("inversionsPage");
    
        if (!sSymbol) {
            MessageToast.show("Por favor, seleccione un símbolo.");
            oPriceModel.setData({ value: [] });
            return Promise.resolve([]); // Devuelve una promesa vacía si no hay símbolo
        }
    
        if (oPage) oPage.setBusy(true);
        return fetch(`http://localhost:3033/api/inv/priceshistory?symbol=${sSymbol}`) // Devuelve la promesa
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        let errorDetail = text;
                        try {
                            const jsonError = JSON.parse(text);
                            errorDetail = jsonError.message || jsonError.error?.message || text;
                        } catch (e) { }
                        throw new Error(`Error ${response.status}: ${errorDetail}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                let aTransformedData = [];
                const dataArray = Array.isArray(data) ? data : (data && Array.isArray(data.value) ? data.value : null);
    
                if (dataArray) {
                    aTransformedData = this._transformDataForVizFrame(dataArray);
                } else {
                    console.warn(`[VIZFRAME] Estructura de datos inesperada para ${sSymbol}`, data);
                }
                oPriceModel.setData({ value: aTransformedData });
    
                // Configurar el gráfico después de cargar los datos
                this._configureChart();
                return aTransformedData; // Devuelve los datos transformados
            })
            .catch(error => {
                console.error(`[DATOS] Error cargando o procesando datos de precios para ${sSymbol}:`, error.message);
                oPriceModel.setData({ value: [] });
                MessageBox.error(`Error al cargar datos para ${sSymbol}: ${error.message}`);
                throw error; // Propaga el error
            })
            .finally(() => {
                if (oPage) oPage.setBusy(false);
            });
    },

    _transformDataForVizFrame: function(aApiData) {
        if (!aApiData || !Array.isArray(aApiData)) {
            return [];
        }
        return aApiData.map(oItem => {
            let dateValue = oItem.DATE || oItem.date;

            let closeValue = parseFloat(oItem.CLOSE || oItem.close);
            if (isNaN(closeValue)) closeValue = null;

            return {
                DATE: dateValue,
                OPEN: parseFloat(oItem.OPEN) || null,
                HIGH: parseFloat(oItem.HIGH) || null,
                LOW: parseFloat(oItem.LOW) || null,
                CLOSE: closeValue,
                VOLUME: parseFloat(oItem.VOLUME) || null,
            };
        });
    },

    _configureChart: function() {
        const oVizFrame = this.byId("idVizFrame");
        if (!oVizFrame) {
            console.warn("Función _configureChart: VizFrame con ID 'idVizFrame' no encontrado en este punto del ciclo de vida.");
            return;
        }
    
        oVizFrame.setVizProperties({
            plotArea: {
                dataLabel: { visible: false },
                window: {
                    start: null, 
                    end: null   
                }
            },
            valueAxis: {
                title: { text: "Precio de Cierre (USD)" }
            },
            timeAxis: {
                title: { text: "Fecha" },
                levels: ["day", "month", "year"],
                label: {
                    formatString: "dd/MM/yy"
                }
            },
            title: {
                text: "Histórico de Precios de Acciones"
            },
            legend: {
                visible: false
            },
            toolTip: {
                visible: true,
                formatString: "#,##0.00"
            },
            interaction: {
                zoom: {
                    enablement: "enabled"
                },
                selectability: {
                    mode: "single"
                }
            }
        });
        console.log("Propiedades de VizFrame configuradas para permitir zoom.");
    },

      // PANEL DE ESTRATEGIAS
      _setDefaultDates: function () { 
          var oStrategyAnalysisModel = this.getView().getModel("strategyAnalysisModel");
          var oToday = new Date();
          oStrategyAnalysisModel.setProperty("/endDate", new Date(oToday));
          var oStartDate = new Date(oToday);
          oStartDate.setMonth(oStartDate.getMonth() - 6);
          oStrategyAnalysisModel.setProperty("/startDate", new Date(oStartDate));
      },
      
      onStrategyChange: function (oEvent) { 
          var oStrategyAnalysisModel = this.getView().getModel("strategyAnalysisModel");
          var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
          oStrategyAnalysisModel.setProperty("/controlsVisible", !!sSelectedKey);
      },

      onRunAnalysisPress: function () {
          var oStrategyAnalysisModel = this.getView().getModel("strategyAnalysisModel");
          var oFinalStrategyResultModel = this.getView().getModel("strategyResultModel"); // Corregido
          var oResourceBundle = this._oResourceBundle; 
          var oPage = this.getView().byId("inversionsPage"); 

          var sStrategyKey = oStrategyAnalysisModel.getProperty("/strategyKey");
          var sLongSMA = oStrategyAnalysisModel.getProperty("/longSMA");
          var sShortSMA = oStrategyAnalysisModel.getProperty("/shortSMA");
          var oStartDate = oStrategyAnalysisModel.getProperty("/startDate");
          var oEndDate = oStrategyAnalysisModel.getProperty("/endDate");

          var oDateFormat = DateFormat.getDateInstance({pattern: "yyyy-MM-dd"});
          var sFormattedStartDate = oStartDate ? oDateFormat.format(oStartDate) : "N/A";
          var sFormattedEndDate = oEndDate ? oDateFormat.format(oEndDate) : "N/A";

          var textWarningSelectStrategy = "Por favor, seleccione una estrategia (fallback)";
          var textStrategyDataLogged = "Parámetros enviados a consola (fallback)";

          if (oResourceBundle && typeof oResourceBundle.getText === 'function') {
              textWarningSelectStrategy = oResourceBundle.getText("warningSelectStrategy");
              textStrategyDataLogged = oResourceBundle.getText("strategyDataLogged");
          } else {
              console.warn("ResourceBundle no disponible en onRunAnalysisPress. Usando textos fallback.");
          }

          if (!sStrategyKey) {
              MessageBox.warning(textWarningSelectStrategy);
              return;
          }

          var aStrategies = oStrategyAnalysisModel.getProperty("/strategies");
          var oSelectedStrategyObject = aStrategies.find(function(strategy) {
              return strategy.key === sStrategyKey;
          });
          var sStrategyText = oSelectedStrategyObject ? oSelectedStrategyObject.text : sStrategyKey; 

          console.log("--- Parámetros para Análisis de Estrategia ---");
          console.log("Estrategia Seleccionada: " + sStrategyText + " (Key: " + sStrategyKey + ")");
          console.log("Long SMA: " + sLongSMA);
          console.log("Short SMA: " + sShortSMA);
          console.log("Fecha de Inicio: " + sFormattedStartDate);
          console.log("Fecha de Fin: " + sFormattedEndDate);

          if (oPage) oPage.setBusy(true);

          // SIMULACIÓN API
          setTimeout(function() {
              var mockApiResult = {
                  signal: Math.random() > 0.5 ? "golden_cross" : "death_cross",
                  date_from: sFormattedStartDate,
                  date_to: sFormattedEndDate,
                  moving_averages: {
                      short: parseInt(sShortSMA),
                      long: parseInt(sLongSMA)
                  },
                  signals: [
                      { date: new Date(2024, 0, 10), type: "buy", price: parseFloat((Math.random() * 10 + 150).toFixed(2)), confidence: "high" },
                      { date: new Date(2024, 0, 20), type: "sell", price: parseFloat((Math.random() * 10 + 160).toFixed(2)), confidence: "medium" }
                  ],
                  chart_data: {},
                  result: parseFloat((Math.random() * 20000 - 5000).toFixed(2))
              };
          
              mockApiResult.hasResults = true;
              if (oFinalStrategyResultModel) {
                  oFinalStrategyResultModel.setData(mockApiResult);
                  oFinalStrategyResultModel.refresh(true);
              } else {
                  console.error("oFinalStrategyResultModel no está definido en onRunAnalysisPress dentro de setTimeout");
              }
          
              if (oPage) oPage.setBusy(false);
          }.bind(this), 1500);
      },

      // Método del Sidebar
      // onToggleSidebarPress: function() {
      //     var oSidebarLayoutData = this.byId("sidebarLayoutData"); 

      //     if (oSidebarLayoutData) {
      //         if (this._bSidebarExpanded) {
      //             this._sSidebarOriginalSize = oSidebarLayoutData.getSize();
      //             oSidebarLayoutData.setSize("0px");
      //         } else {
      //             oSidebarLayoutData.setSize(this._sSidebarOriginalSize);
      //         }
      //         this._bSidebarExpanded = !this._bSidebarExpanded;

      //         var oButton = this.byId("toggleSidebarButton");
      //         if (oButton) {
      //             oButton.setIcon(this._bSidebarExpanded ? "sap-icon://menu2" : "sap-icon://open-command-field");
      //         }
      //     } else {
      //         console.error("No se pudo encontrar sidebarLayoutData para plegar/desplegar.");
      //     }
      // },

      onRefreshChart: function() {
        const oSymbolModel = this.getView().getModel("symbolModel");
        const sCurrentSymbol = oSymbolModel.getProperty("/selectedSymbol");

        if (sCurrentSymbol) {
            // Refresca los datos de la tabla y el gráfico
            this._loadPriceData(sCurrentSymbol);
        } else {
            const aSymbols = oSymbolModel.getProperty("/symbols");
            if (aSymbols && aSymbols.length > 0) {
                const sDefaultSymbol = aSymbols[0].symbol;
                oSymbolModel.setProperty("/selectedSymbol", sDefaultSymbol);
                this._loadPriceData(sDefaultSymbol);
            } else {
                MessageToast.show("Por favor, seleccione un símbolo.");
            }
        }
    },

    onDataPointSelect: function(oEvent) {
        const oData = oEvent.getParameter("data");
        console.log("Datos seleccionados:", oData);
    
        if (oData && oData.length > 0) {
            const oSelectedData = oData[0];
            console.log("Datos del punto seleccionado:", oSelectedData);
    
            const sFecha = oSelectedData.data.DATE; 
            const fPrecioCierre = oSelectedData.data.CLOSE; 
    
            if (sFecha && fPrecioCierre !== undefined) {
                const oViewModel = this.getView().getModel("viewModel");
                oViewModel.setProperty("/selectedPoint", {
                    DATE: sFecha,
                    CLOSE: fPrecioCierre
                });
            } else {
                console.warn("Los datos seleccionados no contienen DATE o CLOSE.");
            }
        } else {
            console.warn("No se seleccionaron datos.");
        }
    },

    onTimeIntervalChange: function(oEvent) {
        const sKey = oEvent.getParameter("selectedItem").getKey();
        const oPriceModel = this.getView().getModel("priceData");
        const aOriginalData = oPriceModel.getProperty("/originalValue"); // Datos originales
        const aData = aOriginalData || []; // Usa los datos originales si están disponibles
    
        if (!aData || aData.length === 0) {
            MessageToast.show("No hay datos originales disponibles para filtrar.");
            return;
        }
    
        // Calcula la fecha de inicio según el intervalo seleccionado
        const oEndDate = new Date();
        let oStartDate;
        switch (sKey) {
            case "1D": // Último día
                oStartDate = new Date(oEndDate);
                oStartDate.setDate(oEndDate.getDate() - 1);
                break;
            case "1W": // Última semana
                oStartDate = new Date(oEndDate);
                oStartDate.setDate(oEndDate.getDate() - 7);
                break;
            case "1M": // Último mes
                oStartDate = new Date(oEndDate);
                oStartDate.setMonth(oEndDate.getMonth() - 1);
                break;
            case "1Y": // Último año
                oStartDate = new Date(oEndDate);
                oStartDate.setFullYear(oEndDate.getFullYear() - 1);
                break;
            case "ALL": // Historial completo
            default:
                oStartDate = null; // No filtrar
                break;
        }
    
        // Filtra los datos según el intervalo
        const oDateFormat = DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        const aFilteredData = oStartDate
            ? aData.filter(oItem => {
                const oItemDate = new Date(oItem.DATE); // Usa new Date() para convertir la fecha
                return oItemDate >= oStartDate && oItemDate <= oEndDate;
            })
            : aData;
    
        if (aFilteredData.length === 0) {
            MessageToast.show("No hay datos disponibles para el intervalo seleccionado.");
            oPriceModel.setProperty("/value", aOriginalData); // Restaura los datos originales
            return;
        }
    
        // Actualiza el modelo con los datos filtrados
        console.log("Datos filtrados:", aFilteredData);
        oPriceModel.setProperty("/value", aFilteredData);
    }
  });
});
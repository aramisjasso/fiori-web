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
            value: [], 
            minValueLabel: "",
            maxValueLabel: "",
            firstDateLabel: "",
            lastDateLabel: ""
          }), "priceData");

          // 3. Configurar gráfica
          //this._configureChart();

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
        const oComboBox = oEvent.getSource(); // Obtiene el ComboBox
        const oSelectedItem = oComboBox.getSelectedItem(); // ¡Método correcto!
        if (oSelectedItem) {
          const sSelectedSymbol = oSelectedItem.getKey();
          this._loadPriceData(sSelectedSymbol);
        }
      },

      // Versión de _loadPriceData de tu compañero
      _loadPriceData: function(sSymbol) {
        const oView = this.getView();
        const oPriceModel = oView.getModel("priceData");
        const oPage = this.byId("inversionsPage");

        if (!sSymbol) {
            MessageToast.show("Por favor, seleccione un símbolo.");
            // Limpiar datos si no hay símbolo
            oPriceModel.setData({ value: [], minValueLabel: "", maxValueLabel: "", firstDateLabel: "", lastDateLabel: "" });
            return;
        }

        if (oPage) oPage.setBusy(true);
        fetch(`http://localhost:3033/api/inv/priceshistory?symbol=${sSymbol}`)
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

                let aProcessedDataForTableAndChart = [];
                let sFirstDateLabel = "";               
                let sLastDateLabel = "";                
                let sMinValueLabel = "";                
                let sMaxValueLabel = "";                
                let minValue = Infinity;               
                let maxValue = -Infinity;               

                // Determinar si 'data' es el array o si está envuelto en 'data.value'
                const dataArray = Array.isArray(data) ? data : (data && Array.isArray(data.value) ? data.value : null);

                if (dataArray && dataArray.length > 0) {
                    const oDateFormatForLabels = DateFormat.getDateInstance({ pattern: "dd/MM/yy" });

                    // Procesar cada item para la tabla y el gráfico
                    aProcessedDataForTableAndChart = dataArray.map((item, index) => {
                        let timestamp = 0;          // Para el eje X
                        let closeValueForChart = 0; // Para el eje Y
                        let formattedDateForLabel = String(item.DATE);

                        // convertir DATE a timestamp para el eje X del gráfico
                        if (item.DATE) {
                            const dateParts = String(item.DATE).split('-'); 
                            let dateObject;
                            if (dateParts.length === 3) {
                                dateObject = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));
                            } else {
                                dateObject = new Date(item.DATE);
                            }

                            if (dateObject && !isNaN(dateObject.getTime())) {
                                timestamp = dateObject.getTime();
                                formattedDateForLabel = oDateFormatForLabels.format(dateObject);
                                if (index === 0) sFirstDateLabel = formattedDateForLabel;
                                if (index === dataArray.length - 1) sLastDateLabel = formattedDateForLabel;
                            } else {
                                console.warn(`[DATOS] Fecha inválida o formato no reconocido: ${item.DATE}`);
                            }
                        }

                        // Convertir CLOSE a número para el eje Y y calcular min/max
                        if (item.CLOSE !== undefined && item.CLOSE !== null) {
                            closeValueForChart = parseFloat(item.CLOSE);
                            if (isNaN(closeValueForChart)) {
                                console.warn(`[DATOS] Valor CLOSE no numérico: ${item.CLOSE}`);
                                closeValueForChart = 0;
                            } else {
                             
                                if (closeValueForChart < minValue) minValue = closeValueForChart;
                                if (closeValueForChart > maxValue) maxValue = closeValueForChart;
                            }
                        }

                        // Devolver el objeto con propiedades originales para la tabla
                        // y las nuevas propiedades procesadas para el gráfico (TIMESTAMP_X, CLOSE_Y)
                        return {
                            DATE: item.DATE,
                            OPEN: item.OPEN,
                            HIGH: item.HIGH,
                            LOW: item.LOW,
                            CLOSE: item.CLOSE,
                            VOLUME: item.VOLUME,
                            TIMESTAMP_X: timestamp,    
                            CLOSE_Y: closeValueForChart 
                        };
                    });

                    // establecer etiquetas de min/max valor
                    if (isFinite(minValue)) sMinValueLabel = `Min: ${minValue.toFixed(2)}`;
                    if (isFinite(maxValue)) sMaxValueLabel = `Max: ${maxValue.toFixed(2)}`;

                } else {
                    console.warn(`[DATOS] La respuesta para ${sSymbol} no es un array válido o está vacía:`, data);
                    MessageToast.show(`No se encontraron datos de precios para ${sSymbol}.`);
                }

                console.log(`[DATOS] Datos procesados para tabla/gráfico (${sSymbol}):`, aProcessedDataForTableAndChart);
               
                oPriceModel.setData({
                    value: aProcessedDataForTableAndChart, 
                    minValueLabel: sMinValueLabel,         
                    maxValueLabel: sMaxValueLabel,        
                    firstDateLabel: sFirstDateLabel,      
                    lastDateLabel: sLastDateLabel        
                });

            })
            .catch(error => {
                console.error(`[DATOS] Error cargando o procesando datos de precios para ${sSymbol}:`, error.message);
                oPriceModel.setData({ value: [], minValueLabel: "", maxValueLabel: "", firstDateLabel: "", lastDateLabel: "" });
                MessageBox.error(`Error al cargar datos para ${sSymbol}: ${error.message}`);
            })
            .finally(() => {
                if (oPage) oPage.setBusy(false);
            });
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

      // MÉTODOS DE LA GRÁFICA
      // _transformDataForChart: function(aData) {
      //   // Transforma los datos del API al formato que necesita la gráfica
      //   return aData.map(oItem => ({
      //     DATE: oItem.DATE || oItem.date,
      //     CLOSE: oItem.CLOSE || oItem.close
      //   }));
      // },

      // _configureChart: function() {
      //   const oVizFrame = this.byId("idVizFrame");
      //   if (!oVizFrame) return; 
        
      //   // Configuración de la gráfica
      //   oVizFrame.setVizType("line");
      //   oVizFrame.setVizProperties({
      //     plotArea: {
      //       dataLabel: { visible: false } 
      //     },
      //     valueAxis: {
      //       title: { text: "Precio (USD)" }
      //     },
      //     categoryAxis: {
      //       title: { text: "Fecha" },
      //       formatString: "dd/MM" 
      //     },
      //     title: {
      //       text: "Histórico de Precios de Acciones"
      //     }
      //   });
        
      //   oVizFrame.invalidate();
      // },

      onRefreshChart: function() {
        const oSymbolModel = this.getView().getModel("symbolModel");
        const sCurrentSymbol = oSymbolModel.getProperty("/selectedSymbol");

        if (sCurrentSymbol) {
            // Refresca los datos de la tabla y el gráfico
            this._loadPriceData(sCurrentSymbol);
        } else {
            // Opcional: Cargar un símbolo por defecto si no hay ninguno seleccionado
            const aSymbols = oSymbolModel.getProperty("/symbols");
            if (aSymbols && aSymbols.length > 0) {
                const sDefaultSymbol = aSymbols[0].symbol;
                oSymbolModel.setProperty("/selectedSymbol", sDefaultSymbol);
                // Considera actualizar visualmente el ComboBox aquí también si es necesario
                this._loadPriceData(sDefaultSymbol);
            } else {
                MessageToast.show("Por favor, seleccione un símbolo.");
            }
        }
    }
  });
});
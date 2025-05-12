sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",             // De tus cambios (HEAD)
  "sap/ui/core/format/DateFormat",  // De tus cambios (HEAD)
  "sap/m/MessageBox",               // De tus cambios (HEAD)
  "sap/viz/ui5/controls/VizFrame",  // De los cambios de tu compañero
  "sap/viz/ui5/data/FlattenedDataset", // De los cambios de tu compañero
  "sap/viz/ui5/controls/common/feeds/FeedItem" // De los cambios de tu compañero
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox, VizFrame, FlattenedDataset, FeedItem) { // Parámetros combinados
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Inversions", {

      _oResourceBundle: null,
      _bSidebarExpanded: true, 
      _sSidebarOriginalSize: "380px", 

      onInit: function() {
          // 1. Modelo para los símbolos (datos estáticos por ahora)
          this._initSymbolModel();
          
          // 2. Modelo para la tabla (vacío)
          this.getView().setModel(new JSONModel(), "priceData");

          // 3. Configurar gráfica
          this._configureChart();

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

          //Inicialización modelo de resultados (tus cambios)
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

      // Versión de _loadPriceData de tu compañero (actualiza symbolModel)
      _loadPriceData: function(sSymbol) {
      this.getView().getModel("symbolModel").setProperty("/selectedSymbol", sSymbol);
      const oView = this.getView();
      
      fetch(`http://localhost:3033/api/inv/pricehistory?symbol=${sSymbol}`)
        .then(response => response.json())
        .then(data => {
          oView.getModel("priceData").setData(data);
        })
        .catch(error => console.error("Error:", error));
      },

      // PANEL DE ESTRATEGIAS (tus métodos)
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
                  idSimulation: "SIM_" + new Date().getTime(),
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
                  MessageToast.show(textStrategyDataLogged);
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

      // MÉTODOS DE LA GRÁFICA (de los cambios de tu compañero)
      _transformDataForChart: function(aData) {
        // Transforma los datos del API al formato que necesita la gráfica
        return aData.map(oItem => ({
          DATE: oItem.DATE || oItem.date,
          CLOSE: oItem.CLOSE || oItem.close
        }));
      },

      _configureChart: function() {
        const oVizFrame = this.byId("idVizFrame");
        if (!oVizFrame) return; // Validación por si no encuentra el control
        
        // Configuración de la gráfica
        oVizFrame.setVizType("line");
        oVizFrame.setVizProperties({
          plotArea: {
            dataLabel: { visible: false } // Mejor para líneas
          },
          valueAxis: {
            title: { text: "Precio (USD)" }
          },
          categoryAxis: {
            title: { text: "Fecha" },
            formatString: "dd/MM" // Formato de fecha
          },
          title: {
            text: "Histórico de Precios de Acciones"
          }
        });
        
        // Opcional: Forzar redibujado al cambiar datos
        oVizFrame.invalidate();
      },

      onRefreshChart: function() {
        const oSymbolModel = this.getView().getModel("symbolModel");
        const sCurrentSymbol = oSymbolModel.getProperty("/selectedSymbol");
        if (sCurrentSymbol) {
          this._loadPriceData(sCurrentSymbol);
        }
      },
  });
});
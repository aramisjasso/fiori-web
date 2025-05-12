sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, DateFormat, MessageBox) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Inversions", {

      _oResourceBundle: null,
      _bSidebarExpanded: true, 
      _sSidebarOriginalSize: "380px", 

      onInit: function() {
          this._initSymbolModel();
          this.getView().setModel(new JSONModel(), "priceData");

          // Inicializar el modelo de análisis con textos de carga/fallback
          var oStrategyAnalysisModelData = {
              strategyKey: "",
              longSMA: 200,
              shortSMA: 50,
              startDate: null,
              endDate: null,
              controlsVisible: false,
              strategies: [
                  { key: "", text: "Cargando textos..." }, // Texto temporal
                  { key: "MACrossover", text: "Cargando textos..." } // Texto temporal
              ]
          };
          var oStrategyAnalysisModel = new JSONModel(oStrategyAnalysisModelData);

          //Inicialización modelo de resultadso
          var oStrategyResultModel = new JSONModel({
            hasResults: false,
            idSimulation: null,
            signal: null,
            date_from: null,
            date_to: null,
            moving_averages: { short: null, long: null },
            signals: [
            ],
            chart_data: {},
            result: null
          });
          this.getView().setModel(oStrategyResultModel, "strategyResultModel");

          

          this.getView().setModel(oStrategyAnalysisModel, "strategyAnalysisModel");

          this._setDefaultDates();

          // Cargar el ResourceBundle asíncronamente
          var oI18nModel = this.getOwnerComponent().getModel("i18n");

          if (oI18nModel) {
              var oResourceBundlePromise = oI18nModel.getResourceBundle(); // Esto es una Promesa

              oResourceBundlePromise.then(function(oLoadedBundle) {
                  console.log("Promesa del ResourceBundle resuelta. Bundle:", oLoadedBundle);
                  if (oLoadedBundle && typeof oLoadedBundle.getText === 'function') {
                      this._oResourceBundle = oLoadedBundle; // Guardar el bundle en el controlador

                      // Actualizar el modelo con los textos traducidos
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
                  // Los textos de fallback ya están, o puedes poner un mensaje más específico
                   oStrategyAnalysisModel.setProperty("/strategies", [
                      { key: "", text: "Error Promesa i18n: Seleccione..." },
                      { key: "MACrossover", text: "Error Promesa i18n: Cruce Medias..." }
                  ]);
              });
          } else {
              console.error("Modelo i18n no encontrado. Usando textos por defecto.");
               oStrategyAnalysisModel.setProperty("/strategies", [ // Fallback si no hay modelo i18n
                  { key: "", text: "No i18n: Seleccione..." },
                  { key: "MACrossover", text: "No i18n: Cruce Medias..." }
              ]);
          }

          var oSidebarLayoutData = this.byId("sidebarLayoutData");
            if (oSidebarLayoutData) {
                this._sSidebarOriginalSize = oSidebarLayoutData.getSize();
            } else {
                // Si el ID no está en el layoutData sino en el VBox, y el layoutData es el primer hijo
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
          const oComboBox = oEvent.getSource();
          const oSelectedItem = oComboBox.getSelectedItem();
          if (oSelectedItem) {
              const sSelectedSymbol = oSelectedItem.getKey();
              this._loadPriceData(sSelectedSymbol);
          }
      },

      _loadPriceData: function(sSymbol) {
          const oView = this.getView();
          fetch(`http://localhost:3033/api/inv/pricehistory?symbol=${sSymbol}`)
              .then(response => response.json())
              .then(data => {
                  oView.getModel("priceData").setData(data);
                  oView.getModel("priceData").refresh(true); 
              })
              .catch(error => console.error("Error al cargar datos de precios:", error));
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
        var oFinalStrategyResultModel = this.getView().getModel("strategyResultModel");
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
        setTimeout(function() { // Asegúrate que esta función anónima esté bien cerrada
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
            if (oFinalStrategyResultModel) { // Verificar que el modelo se obtuvo bien
                oFinalStrategyResultModel.setData(mockApiResult);
                oFinalStrategyResultModel.refresh(true);
                MessageToast.show(textStrategyDataLogged);
            } else {
                console.error("oFinalStrategyResultModel no está definido en onRunAnalysisPress dentro de setTimeout");
            }
        
            if (oPage) oPage.setBusy(false);
        }.bind(this), 1500); // Cierre correcto del setTimeout y su bind
    },

      onToggleSidebarPress: function() {
        var oSidebarLayoutData = this.byId("sidebarLayoutData"); 

        if (oSidebarLayoutData) {
            if (this._bSidebarExpanded) {
                // Colapsar: guardar tamaño actual y poner a 0 o un tamaño mínimo
                this._sSidebarOriginalSize = oSidebarLayoutData.getSize(); // Guardar tamaño actual si se redimensionó
                oSidebarLayoutData.setSize("0px");
            } else {
                // Expandir: restaurar tamaño original
                oSidebarLayoutData.setSize(this._sSidebarOriginalSize);
            }
            this._bSidebarExpanded = !this._bSidebarExpanded;

            // Actualizar el icono del botón (opcional)
            var oButton = this.byId("toggleSidebarButton");
            if (oButton) {
                oButton.setIcon(this._bSidebarExpanded ? "sap-icon://menu2" : "sap-icon://open-command-field");
            }

        } else {
            console.error("No se pudo encontrar sidebarLayoutData para plegar/desplegar.");
        }
    }
  });
});
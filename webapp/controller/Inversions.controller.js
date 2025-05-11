sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/controls/VizFrame",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem"
], function(Controller, JSONModel, VizFrame, FlattenedDataset, FeedItem) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Inversions", {
    onInit: function() {
      // 1. Modelo para los símbolos (datos estáticos por ahora)
      this._initSymbolModel();
      
      // 2. Modelo para la tabla (vacío)
      this.getView().setModel(new JSONModel(), "priceData");

      // 3. Configurar gráfica
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
      const oComboBox = oEvent.getSource(); // Obtiene el ComboBox
      const oSelectedItem = oComboBox.getSelectedItem(); // ¡Método correcto!
      if (oSelectedItem) {
        const sSelectedSymbol = oSelectedItem.getKey();
        this._loadPriceData(sSelectedSymbol);
      }
    },

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
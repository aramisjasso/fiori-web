sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Inversions", {
    onInit: function() {
      // 1. Modelo para los símbolos (datos estáticos por ahora)
      this._initSymbolModel();
      
      // 2. Modelo para la tabla (vacío)
      this.getView().setModel(new JSONModel(), "priceData");
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
      const oView = this.getView();
      
      fetch(`http://localhost:3033/api/inv/pricehistory?symbol=${sSymbol}`)
        .then(response => response.json())
        .then(data => {
          oView.getModel("priceData").setData(data);
        })
        .catch(error => console.error("Error:", error));
    }
  });
});
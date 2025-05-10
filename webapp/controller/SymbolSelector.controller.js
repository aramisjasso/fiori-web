sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.SymbolSelector", {
    onInit: function() {
      
      const oModel = new JSONModel({
        symbols: [
          { symbol: "TSLA", name: "Tesla" },
          { symbol: "AAPL", name: "Apple" },
          { symbol: "MSFT", name: "Microsoft" },
          { symbol: "AMZN", name: "Amazon" }
        ]
      });
      this.getView().setModel(oModel);
    },

    onSelectionFinish: function(oEvent) {
      const aSelectedItems = oEvent.getParameter("selectedItems");
      const aSymbols = aSelectedItems.map(oItem => oItem.getKey());
      
      // Emite evento global con los símbolos seleccionados
      this.getOwnerComponent().getEventBus().publish("SymbolChannel", "SelectionChanged", {
        symbols: aSymbols
      });
    }
  });
});
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
  "use strict";
  return Controller.extend("com.inv.sapfiori.controller.PriceHistory", {
    onInit: function() {
      // Cargar datos mock
      var oModel = new JSONModel(sap.ui.require.toUrl("com/inv/sapfiori/model/mockData.json"));
      this.getView().setModel(oModel);
    }
  });
});
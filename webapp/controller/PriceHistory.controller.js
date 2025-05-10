sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.PriceHistory", {
    onInit: function() {
      // 1. Crea un modelo JSON vacío (para bindings)
      const oModel = new JSONModel();
      this.getView().setModel(oModel);
      
      // 2. Carga datos de TSLA al iniciar
      this._loadPriceData("TSLA");
    },

    _loadPriceData: function(sSymbol) {
      const oModel = this.getView().getModel();
      
      // 3. Llama a tu API manualmente (fetch/axios)
      fetch(`http://localhost:3033/api/inv/pricehistory?symbol=${sSymbol}`)
        .then(response => {
          if (!response.ok) throw new Error("Error en la red");
          return response.json();
        })
        .then(data => {
          // 4. Asigna los datos al modelo (¡aquí bindea la vista!)
          oModel.setData({
            priceData: data.value
          });
        })
        .catch(error => {
          console.error("Error cargando datos:", error);
          sap.m.MessageToast.show("Error al cargar datos de " + sSymbol);
        });
    }
  });
});
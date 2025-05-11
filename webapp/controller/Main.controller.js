sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("com.inv.sapfiori.controller.Main", {
    onInit: function() {
      // Inicializa el router y vincula el evento de selección de tabs
      this._oRouter = this.getOwnerComponent().getRouter();
    },

    onTabSelect: function(oEvent) {
      const sKey = oEvent.getParameter("key");
      const oNavCon = this.byId("navCon");

      // Navega al view correspondiente en el NavContainer
      switch(sKey) {
        case "security":
          oNavCon.to(this.byId("securityView"));
          this._oRouter.navTo("security"); 
          break;
        case "catalogs":
          oNavCon.to(this.byId("catalogsView"));
          this._oRouter.navTo("catalogs");
          break;
        case "inversions":
          oNavCon.to(this.byId("inversionsView"));
          this._oRouter.navTo("inversions");
          break;
      }
    }
  });
});
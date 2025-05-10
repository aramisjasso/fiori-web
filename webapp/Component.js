sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/inv/sapfiori/model/models"
], (UIComponent, models) => { // <- Quita ODataModel de aquí
    "use strict";

    return UIComponent.extend("com.inv.sapfiori.Component", {
        metadata: {
            manifest: "json",
            interfaces: ["sap.ui.core.IAsyncContentCreation"]
        },

        init() {
            // 1. Init del padre
            UIComponent.prototype.init.apply(this, arguments);

            // 2. Modelo de dispositivo
            this.setModel(models.createDeviceModel(), "device");

            // 4. Inicia routing
            this.getRouter().initialize();
        }
    });
});
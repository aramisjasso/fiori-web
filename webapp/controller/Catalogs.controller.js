/**
 * ============================================================================
 * CONTROLADOR DE CATÁLOGOS - SAP FIORI
 * ============================================================================
 *
 * Este controlador maneja la gestión de catálogos generales de la aplicación,
 * como categorías, productos, unidades, etc. Incluye funciones para visualizar,
 * crear, actualizar y eliminar entradas de catálogo.
 *
 * @version 1.0
 */

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {

  return Controller.extend("com.inv.sapfiori.controller.Catalogs", {

    /**
     * ========================================================================
     * INICIALIZACIÓN DEL CONTROLADOR
     * ========================================================================
     */
    onInit: function () {

      this._loadValuesData();
    },


    _loadValuesData: function () {
        var sUrl = "http://localhost:3033/api/catalogos/getAllLabels?type=2";

        fetch(sUrl)
            .then(response => {
            if (!response.ok) throw new Error("Error al obtener values");
            return response.json();
            })
            .then(data => {
            // Asumimos que data.value es el array que necesitas mostrar
            var oModel = new JSONModel({ values: data.value });
            this.getView().setModel(oModel, "values");
            MessageToast.show("Valores cargados exitosamente: " + data.value.length);
            })
            .catch(error => {
            MessageToast.show("Error cargando values: " + error.message);
            });
        },
  });

});

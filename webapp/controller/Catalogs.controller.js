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
  "sap/m/MessageBox",
], function (Controller, JSONModel, MessageToast, MessageBox) {

  return Controller.extend("com.inv.sapfiori.controller.Catalogs", {

    /**
     * ========================================================================
     * INICIALIZACIÓN DEL CONTROLADOR
     * ========================================================================
     */
    onInit: function() {
      this._loadLabelsData();
    },

    // Cargar datos desde API
    _loadLabelsData: function() {
      var sUrl = "http://localhost:3033/api/catalogos/getAllLabels?type=1";

      fetch(sUrl)
        .then(response => {
          if (!response.ok) throw new Error("Error al obtener labels");
          return response.json();
        })
        .then(data => {
          var oModel = new JSONModel({ labels: data.value });
          this.getView().setModel(oModel, "labels");
          MessageToast.show("Labels cargados");
        })
        .catch(error => {
          MessageToast.show("Error cargando labels: " + error.message);
        });
    },

    // Refrescar la tabla
    onRefreshLabels: function() {
      this._loadLabelsData();
    },

    // Abrir diálogo para crear Label
    onCrearLabel: function() {
      this.byId("createLabelDialog").open();
    },

    // Cerrar diálogo de creación
    onCloseLabelDialog: function() {
      this.byId("createLabelDialog").close();
    },

    // Confirmar creación
    onConfirmCreateLabel: function () {
  const oView = this.getView();

  const newLabel = {
  COMPANYID: "0",
  CEDIID: "0",
  LABELID: this.byId("labelIdInput").getValue(),
  LABEL: this.byId("labelNameInput").getValue(),
  INDEX: this.byId("labelIndexInput").getValue(),
  COLLECTION: this.byId("labelCollectionInput").getValue(),
  SECTION: this.byId("labelSectionInput").getValue(),
  SEQUENCE: Number(this.byId("labelSequenceInput").getValue()) || 0,
  IMAGE: this.byId("labelImageInput") ? this.byId("labelImageInput").getValue() : "",
  DESCRIPTION: this.byId("labelDescriptionInput").getValue(),
  DETAIL_ROW: {
    ACTIVED: true,
    DELETED: false,
    DETAIL_ROW_REG: {
      CURRENT: true,
      REGDATE:  new Date().toISOString(),
      REGUSER: "Oscar"
    }
  }
};

fetch("http://localhost:3033/api/catalogos/createLabel", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    type: 1,
    label: newLabel
  })
})
.then(async response => {
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error("Error del servidor: " + responseText);
  }
  MessageToast.show("Label creado exitosamente");
  this.byId("createLabelDialog").close();
  this._loadLabelsData();
})
.catch(error => {
  MessageBox.error("Error al crear label: " + error.message);
});
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

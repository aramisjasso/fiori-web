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

    // Metodo para cargar los datos de valores
    
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
            })
            .catch(error => {
            MessageToast.show("Error cargando values: " + error.message);
            });
        },
    // Método para refrescar los datos de valores
    _refreshValuesData: function () {
      var sUrl = "http://localhost:3033/api/catalogos/getAllLabels?type=2";
      var that = this;

      // Mostrar indicador de carga si tienes un viewModel
      var oViewModel = that.getView().getModel("viewModel");
      if (oViewModel) {
        oViewModel.setProperty("/tableBusy", true);
      }

      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Error al obtener los values: " + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          var valuesData = data.value || [];

          // Obtener el modelo o crear uno nuevo
          var oValuesModel = that.getView().getModel("values");
          if (!oValuesModel) {
            oValuesModel = new JSONModel();
            that.getView().setModel(oValuesModel, "values");
          }

          oValuesModel.setData({ values: valuesData });

          // Actualizar la marca de última actualización
          if (oViewModel) {
            oViewModel.setProperty("/lastRefresh", new Date());
          }
        })
        .catch(function (error) {
          MessageBox.error("Error al cargar values: " + error.message);
          console.error("Error cargando values:", error);
        })
        .finally(function () {
          if (oViewModel) {
            oViewModel.setProperty("/tableBusy", false);
          }
        });
    },
    // Método forzar la actualización de los datos
    onRefreshValues: function () {
      MessageToast.show("Actualizando valores...");
      this._refreshValuesData();
    },


    /* ========================================================================
     * MÉTODOS para la creación, actualización y eliminación de valores
     * ========================================================================
     */
    
    /* ========================
     * Creación de valores
     * ========================
    */
    
    
        onConfirmCreateValue: function () {
      // Obtener los valores de los campos del formulario
      var oView = this.getView();
      var labelId = oView.byId("CVD_labelIdInput").getValue();
      var valueId = oView.byId("CVD_valueIdInput").getValue();
      var value = oView.byId("CVD_valueInput").getValue();
      var valuepaid = oView.byId("CVD_valueParentIdInput").getValue();
      var companyId = oView.byId("CVD_companyIdInput").getValue();
      var cediiId = oView.byId("CVD_cediIdInput").getValue();
      var alias = oView.byId("CVD_aliasInput").getValue();
      var sequence = oView.byId("CVD_sequenceInput").getValue();
      var description = oView.byId("CVD_descriptionInput").getValue();
      var image = oView.byId("CVD_imageInput").getValue();
      var active = oView.byId("CVD_activeSwitch").getState();


      // Crear el objeto de valor
      var valueData = {
        COMPANYID: companyId,
        CEDIID: cediiId,
        LABELID: labelId,
        VALUEID: valueId,
        VALUEPAID: valuepaid,
        VALUE: value,
        ALIAS: alias,
        SEQUENCE: sequence,
        DESCRIPTION: description,
        IMAGE: image,
        DETAIL_ROW: {
          ACTIVED: active,
          DELETED: false,
          DETAIL_ROW_REG: [{
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: "Miguel Angel",
          }]
        }
      };


      // Aquí enviarías el objeto a un servicio backend o procesarlo según lo necesites
            // Hacer el fetch POST para enviar los datos al servidor
      fetch("http://localhost:3033/api/catalogos/createLabel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: 2, value: valueData })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            this.onCloseCreateValueDialog();
            MessageToast.show("Valor creado exitosamente!");
            this._refreshValuesData(); // Recargar los datos
            
          } else {
            MessageToast.show("Error al crear el valor.");
          }
        })
        .catch(error => {
          MessageToast.show("Hubo un error al crear el valor.");
        });
    },

    // Método para abrir el diálogo de creación de valores
    onCreateValueDialog: function () {
      var oDialog = this.byId("createValueDialog");
      if (!oDialog) {
        // Si el diálogo no existe, lo creamos de manera programática
        oDialog = sap.ui.xmlfragment("com.inv.sapfiori.view.createValueDialog", this);
        this.getView().addDependent(oDialog);
      }
      oDialog.open(); // Abrir el diálogo
    },

    // Método para cerrar el diálogo
    onCloseCreateValueDialog: function () {
      this.byId("createValueDialog").close();
    },

    /* ========================================================================
     * Actualización de valores
     * ========================================================================
     */

    onConfirmUpdateValue: function () {
      // Obtener los valores de los campos del formulario
      var oView = this.getView();
      var labelId = oView.byId("UVD_labelIdInput").getValue();
      var valueId = oView.byId("UVD_valueIdInput").getValue();
      var value = oView.byId("UVD_valueInput").getValue();
      var valuepaid = oView.byId("UVD_valueParentIdInput").getValue();
      var companyId = oView.byId("UVD_companyIdInput").getValue();
      var cediiId = oView.byId("UVD_cediIdInput").getValue();
      var alias = oView.byId("UVD_aliasInput").getValue();
      var sequence = oView.byId("UVD_sequenceInput").getValue();
      var description = oView.byId("UVD_descriptionInput").getValue();
      var image = oView.byId("UVD_imageInput").getValue();
      var active = oView.byId("UVD_activeSwitch").getState();
      var deleted = oView.byId("UVD_deletedSwitch").getState();

      // Crear el objeto de valor
      var valueData = {
        COMPANYID: companyId,
        CEDIID: cediiId,
        VALUE: value,
        ALIAS: alias,
        SEQUENCE: sequence,
        DESCRIPTION: description,
        IMAGE: image,
        DETAIL_ROW: {
          ACTIVED: active,
          DELETED: deleted,
          DETAIL_ROW_REG: [{
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: "Miguel Angel",
          }]
        }
      };


      // Aquí enviarías el objeto a un servicio backend o procesarlo según lo necesites
            // Hacer el fetch POST para enviar los datos al servidor
      fetch(`http://localhost:3033/api/catalogos/updateLabel?type=2&id=${valueId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ value: valueData })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            this.onCloseUpdateValueDialog();
            MessageToast.show("Valor actualizado exitosamente!");
            this._refreshValuesData(); // Recargar los datos
            idValues = null; // Limpiar el ID después de la actualización
            
          } else {
            MessageToast.show("Error al actualizar el valor.");
          }
        })
        .catch(error => {
          MessageToast.show("Hubo un error al actualizar el valor.");
        });
    },
        // Método para abrir el diálogo de creación de valores
    onUpdateValueDialog: function () {
      var oTable = this.byId("tablaValues");
      var oContext = oTable.getSelectedItem()?.getBindingContext("values");

      if (!oContext) {
        MessageToast.show("Por favor, seleccione un valor para eliminar.");
        return;
      }

      var sPath = oContext.getPath();
      var iIndex = parseInt(sPath.split("/")[2], 10);
      var aValues = this.getView().getModel("values").getProperty("/values");
      var VALUEID = aValues[iIndex].VALUEID;
      idValues = VALUEID;
      var LABELID = aValues[iIndex].LABELID;
      var COMPANYID = aValues[iIndex].COMPANYID;
      var CEDIID = aValues[iIndex].CEDIID;
      var VALUEPAID = aValues[iIndex].VALUEPAID;
      var VALUE = aValues[iIndex].VALUE;
      var ALIAS = aValues[iIndex].ALIAS;
      var SEQUENCE = aValues[iIndex].SEQUENCE;
      var DESCRIPTION = aValues[iIndex].DESCRIPTION;
      var IMAGE = aValues[iIndex].IMAGE;
      var IMAGE = aValues[iIndex].IMAGE;
      var ACTIVED = aValues[iIndex].DETAIL_ROW.ACTIVED;
      var DELETED = aValues[iIndex].DETAIL_ROW.DELETED;


      // Abrir el diálogo de actualización
      var oDialog = this.byId("updateValueDialog");
                // Obtener los valores de los campos del formulario
      var oView = this.getView();
      // Cargar los valores en los campos del diálogo
      oView.byId("UVD_labelIdInput").setValue(LABELID || "");
      oView.byId("UVD_valueIdInput").setValue(VALUEID || "");
      oView.byId("UVD_valueInput").setValue(VALUE);
      oView.byId("UVD_valueParentIdInput").setValue(VALUEPAID);
      oView.byId("UVD_companyIdInput").setValue(COMPANYID);
      oView.byId("UVD_cediIdInput").setValue(CEDIID);
      oView.byId("UVD_aliasInput").setValue(ALIAS);
      oView.byId("UVD_sequenceInput").setValue(SEQUENCE);
      oView.byId("UVD_descriptionInput").setValue(DESCRIPTION);
      oView.byId("UVD_imageInput").setValue(IMAGE);
      oView.byId("UVD_activeSwitch").setState(ACTIVED);
      oView.byId("UVD_deletedSwitch").setState(DELETED);


      if (!oDialog) {
        // Si el diálogo no existe, lo creamos de manera programática
        oDialog = sap.ui.xmlfragment("com.inv.sapfiori.view.updateValueDialog", this);
        this.getView().addDependent(oDialog);
      }
      oDialog.open(); // Abrir el diálogo
    },

    // Método para cerrar el diálogo
    onCloseUpdateValueDialog: function () {
      this.byId("updateValueDialog").close();
    },

    /* ========================
     * Eliminación de valores
     * ========================
    */

    onDeleteValue: function () {
      var oTable = this.byId("tablaValues");
      var oContext = oTable.getSelectedItem()?.getBindingContext("values");

      if (!oContext) {
        MessageToast.show("Por favor, seleccione un valor para eliminar.");
        return;
      }

      var sPath = oContext.getPath();
      var iIndex = parseInt(sPath.split("/")[2], 10);
      var aValues = this.getView().getModel("values").getProperty("/values");
      var VALUEID = aValues[iIndex].VALUEID;

      // Hacer fetch POST con acción delete
      fetch(`http://localhost:3033/api/catalogos/deleteLabelOrValue?type=2&id=${VALUEID}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            const errorMsg = data?.error?.message || data?.message || "Error desconocido al eliminar el value";
            throw new Error(errorMsg);
          }

          MessageToast.show("Valor eliminado con éxito");
          aValues.splice(iIndex, 1);
          this.getView().getModel("values").setProperty("/values", aValues);
          this._refreshValuesData(); // Recargar los datos
        })
        .catch(error => {
          MessageBox.error(error.message || "Ocurrió un error al eliminar el value");
        });
    },
  });

});

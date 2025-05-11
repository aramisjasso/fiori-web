/**
 * ============================================================================
 * CONTROLADOR DE SEGURIDAD - SAP FIORI
 * ============================================================================
 * 
 * Este controlador maneja la gestión completa de roles y privilegios de seguridad
 * dentro de la aplicación SAP Fiori. Incluye la visualización, creación, 
 * actualización y eliminación de roles, así como la asignación de privilegios.
 * 
 * @version 1.0
 */

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox" // ← AÑADIDO AQUÍ
], function (Controller, JSONModel, MessageToast, MessageBox) { // ← AÑADIDO AQUÍ


  return Controller.extend("com.inv.sapfiori.controller.Security", {

    // Array para almacenar los privilegios
    _privileges: [],

    /**
     * ========================================================================
     * INICIALIZACIÓN DEL CONTROLADOR
     * ========================================================================
     */
    
    /**
     * Método de inicialización del controlador
     * Se ejecuta automáticamente cuando la vista es cargada
     * Configura los modelos de datos necesarios para la UI
     */
    onInit: function () {
      // Modelo para USERS
      var oUsersModel = new JSONModel();
      oUsersModel.loadData("model/usuarios.json");  // Aquí cargamos los datos de un archivo JSON
      this.getView().setModel(oUsersModel, "users");

      // Modelo para ROLES (cargado desde API)
      this._loadRolesData();
    },

    /**
     * ========================================================================
     * CARGA DE DATOS Y FORMATEO
     * ========================================================================
     */
    
    /**
     * Carga los datos de roles desde el servidor backend
     * Utiliza fetch para realizar la solicitud HTTP
     * En caso de éxito, formatea los datos y los asigna al modelo
     * En caso de error, muestra un mensaje al usuario
     */
    _loadRolesData: function () {
      var sUrl = "http://localhost:3033/api/sec/usersroles/Roles";  // URL de la API para obtener los roles

      // Usar fetch para obtener los roles desde la API
      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Error en la solicitud: " + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          // Formatear los privilegios antes de cargar los roles
          var formattedData = this.formatPrivilegesInRoles(data.value);

          // Crear un modelo JSON para los roles y asignar los datos obtenidos de la API
          var oRolesModel = new JSONModel();
          console.log(oRolesModel);
          oRolesModel.setData({ roles: formattedData });

          // Asignar el modelo a la vista
          this.getView().setModel(oRolesModel, "roles");
        }.bind(this))  // Aseguramos que 'this' se refiere al controlador
        .catch(function (error) {
          MessageToast.show("Error al cargar los roles: " + error.message);
        });
    },

    /**
     * Formatea los privilegios en un formato legible para la UI
     * Convierte la estructura de datos de privilegios en strings para mostrar
     * 
     * @param {Array} rolesData - Array de objetos de rol recibidos de la API
     * @returns {Array} Array de roles con privilegios formateados como strings
     */
    formatPrivilegesInRoles: function (rolesData) {
      return rolesData.map(function (role) {
        if (role.PRIVILEGES && Array.isArray(role.PRIVILEGES)) {
          // Crear una lista de privilegios en formato de array
          role.PRIVILEGES = role.PRIVILEGES.map(function (privilege) {
            return privilege.PROCESSID + ": " + privilege.PRIVILEGEID.join(", ");
          });
        } else {
          role.PRIVILEGES = ["No tiene privilegios"];  // Valor por defecto si no tiene privilegios
        }
        return role;
      });
    },

    /**
     * ========================================================================
     * GESTIÓN DE DIALOGS (MODALES)
     * ========================================================================
     */
    
    /**
     * Maneja la apertura del diálogo para crear un nuevo rol
     * Si el diálogo no existe, lo crea a través de un fragmento XML
     * y lo agrega como dependiente de la vista principal
     */
    onCrearRol: function () {
      var oDialog = this.byId("createRoleDialog");
      if (!oDialog) {
        // Si el dialog no existe, lo creamos de manera programática
        oDialog = sap.ui.xmlfragment("com.inv.sapfiori.view.CreateRoleDialog", this);
        this.getView().addDependent(oDialog);
      }
      oDialog.open();  // Abrir el dialog
    },

    /**
     * Cierra el diálogo de creación de rol
     * Se llama cuando el usuario cancela o después de crear exitosamente
     */
    onCloseRoleDialog: function () {
      this.byId("createRoleDialog").close();
    },

    /**
     * ========================================================================
     * GESTIÓN DE PRIVILEGIOS
     * ========================================================================
     */
    
    /**
     * Agrega un nuevo privilegio a la lista temporal durante la creación del rol
     * Valida que los campos no estén vacíos antes de agregar
     * Actualiza tanto el array interno como la visualización en pantalla
     */
    onAddPrivilege: function () {
      var oProcessId = this.byId("processIdInput").getValue();
      var oPrivilegeId = this.byId("privilegeIdInput").getValue();

      // Verificar si ambos valores no están vacíos
      if (!oProcessId || !oPrivilegeId) {
        MessageToast.show("Por favor ingrese tanto el Process ID como el Privilege ID.");
        return;
      }

      // Crear un objeto de privilegio y agregarlo al array
      var oPrivilege = {
        PROCESSID: oProcessId,
        PRIVILEGEID: [oPrivilegeId] // Puedes agregar más privilegios si es necesario
      };
      this._privileges.push(oPrivilege); // Actualizar el array de privilegios

      // Agregar el privilegio al contenedor visual
      var oContainer = this.byId("privilegesContainer");
      var oVBox = new sap.m.VBox({
        items: [
          new sap.m.HBox({
            items: [
              new sap.m.Text({ text: "Process ID: " + oProcessId }),
              new sap.m.Text({ text: "Privilege ID: " + oPrivilegeId })
            ]
          })
        ]
      });
      oContainer.addItem(oVBox);

      // Limpiar los campos para ingresar nuevos privilegios
      this.byId("processIdInput").setValue("");
      this.byId("privilegeIdInput").setValue("");
    },

    /**
     * ========================================================================
     * OPERACIONES CRUD DE ROLES
     * ========================================================================
     */
    
    /**
     * Confirma la creación de un nuevo rol
     * Recopila todos los datos del formulario, incluidos los privilegios agregados
     * Envía la solicitud al servidor mediante API REST
     * Muestra mensajes de éxito o error según corresponda
     */
    onConfirmCreateRole: function () {
      // Obtener los valores de los campos del formulario
      var roleId = this.byId("roleIdInput").getValue();
      var roleName = this.byId("roleNameInput").getValue();
      var roleDescription = this.byId("roleDescriptionInput").getValue();
      var isActive = this.byId("roleActiveSwitch").getState();

      // Construir el objeto role a enviar
      var role = {
        ROLEID: roleId,
        ROLENAME: roleName,
        DESCRIPTION: roleDescription,
        PRIVILEGES: this._privileges, // Usar el array de privilegios
        DETAIL_ROW: {
          ACTIVED: isActive,
          DELETED: false,
          DETAIL_ROW_REG: [{
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: "current_user" // Puede usar req.user.id si tienes acceso al usuario en el servidor
          }]
        }
      };
      console.log(role);

      // Hacer el fetch para enviar los datos al servidor
      fetch("http://localhost:3033/api/sec/usersroles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: "role", role: role })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            this.onCloseRoleDialog();
            MessageToast.show("Rol creado exitosamente!");
            this._privileges = []; // Limpiar el array de privilegios
          } else {
            MessageToast.show("Error al crear el rol.");
          }
        })
        .catch(error => {
          console.error("Error:", error);
          MessageToast.show("Hubo un error al crear el rol.");
        });
    },

    //no tocaaarrrrrr

    /**
     * ========================================================================
     * ELIMINACIÓN DE ROLES
     * ========================================================================
     */
    
    /**
     * Maneja la eliminación de un rol existente
     * Obtiene el rol seleccionado en la tabla
     * Confirma la eliminación y actualiza la lista si es exitosa
     * Muestra mensajes apropiados en caso de éxito o error
     */
    onEliminarRol: function () {
      var oTable = this.byId("tablaRoles");
      var oContext = oTable.getSelectedItem()?.getBindingContext("roles");

      if (!oContext) {
        MessageToast.show("Por favor, seleccione un rol para eliminar.");
        return;
      }

      var sPath = oContext.getPath();
      var iIndex = parseInt(sPath.split("/")[2], 10);
      var aRoles = this.getView().getModel("roles").getProperty("/roles");
      var roleID = aRoles[iIndex].ROLEID;

      fetch("http://localhost:3033/api/sec/usersroles/delete", {
        method: "POST",  // Acción personalizada en CAP
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "role",
          id: roleID
        })
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            const errorMsg = data?.error?.message || data?.message || "Error desconocido al eliminar el rol";
            throw new Error(errorMsg);
          }

          MessageToast.show("Rol eliminado con éxito");
          aRoles.splice(iIndex, 1);
          this.getView().getModel("roles").setProperty("/roles", aRoles);
        })
        .catch(error => {
          MessageBox.error(error.message || "Ocurrió un error al eliminar el rol");
        });
    }

  });
});
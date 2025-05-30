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
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {


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
      // Cargar datos de usuarios
      this._loadUsersData();

      // Cargar datos de roles
      this._loadRolesData();

      // Modelo para propiedades de la vista (viewModel)
      var oViewModel = new JSONModel({
        tableBusy: false, // Estado inicial del indicador de ocupado
        lastRefresh: null // Última fecha de actualización
      });
      this.getView().setModel(oViewModel, "viewModel");
    },

    /**
     * ============================================================================
     * OPERACIONES GET - CARGA DE DATOS
     * ============================================================================
     */
    
    /**
     * Carga los datos de roles desde el servidor backend mediante GET
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
     * ============================================================================
     * OPERACIONES GET - ACTUALIZACIÓN DE DATOS
     * ============================================================================
     * 
     * Método que maneja la acción del botón de actualización.
     * Vuelve a cargar los datos de roles desde la API mediante GET.
     */
    onRefreshRoles: function () {
      var oViewModel = this.getView().getModel("viewModel");
      if (oViewModel) {
        oViewModel.setProperty("/tableBusy", true);
      }

      MessageToast.show("Actualizando roles...");
      this._refreshRolesData();
    },

    /**
     * Carga fresca de datos de roles desde la API mediante GET
     * Esta función es una versión mejorada del _loadRolesData original
     * con manejo de estados de ocupado y mensajes adicionales
     */
    _refreshRolesData: function () {
      var sUrl = "http://localhost:3033/api/sec/usersroles/Roles";
      var that = this;

      // Realizar solicitud fetch GET
      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Error en la solicitud: " + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          // Formatear los privilegios antes de cargar los roles
          var formattedData = that.formatPrivilegesInRoles(data.value);

          // Obtener el modelo existente o crear uno nuevo
          var oRolesModel = that.getView().getModel("roles");
          if (!oRolesModel) {
            oRolesModel = new JSONModel();
            that.getView().setModel(oRolesModel, "roles");
          }

          // Actualizar los datos en el modelo
          oRolesModel.setData({ roles: formattedData });

          // Actualizar la marca de tiempo de última actualización
          var oViewModel = that.getView().getModel("viewModel");
          if (oViewModel) {
            oViewModel.setProperty("/lastRefresh", new Date());
          }
        })
        .catch(function (error) {
          MessageBox.error("Error al actualizar los roles: " + error.message);
          console.error("Error al actualizar roles:", error);
        })
        .finally(function () {
          // Ocultar indicadores de ocupado
          var oViewModel = that.getView().getModel("viewModel");
          if (oViewModel) {
            oViewModel.setProperty("/tableBusy", false);
          }
        });
    },

    /**
     * Carga los datos de usuarios desde el servidor backend mediante GET
     * Utiliza fetch para realizar la solicitud HTTP
     * En caso de éxito, asigna los datos al modelo "users"
     */
    _loadUsersData: function () {
      var sUrl = "http://localhost:3033/api/sec/usersroles/fetchAll"; // URL de la API para obtener los usuarios

      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Error en la solicitud: " + response.status);
          }
          return response.json();
        })
        .then(function (data) {
          // Crear un modelo JSON para los usuarios y asignar los datos obtenidos de la API
          var oUsersModel = new JSONModel();
          oUsersModel.setData({ usuarios: data.value });

          // Asignar el modelo a la vista
          this.getView().setModel(oUsersModel, "users");
        }.bind(this)) // Aseguramos que 'this' se refiere al controlador
        .catch(function (error) {
          MessageToast.show("Error al cargar los usuarios: " + error.message);
        });
    },

    /**
     * Método para refrescar los datos de usuarios
     */
    onRefreshUsers: function () {
      MessageToast.show("Actualizando usuarios...");
      this._loadUsersData();
    },

    /**
     * ============================================================================
     * GESTIÓN DE DIALOGS Y UI
     * ============================================================================
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
     * Maneja la apertura del diálogo para crear un nuevo usuario
     * Si el diálogo no existe, lo crea a través de un fragmento XML
     * y lo agrega como dependiente de la vista principal
     */
    onCrearUsuario: function () {
      var oDialog = this.byId("createUserDialog");
      if (!oDialog) {
        // Si el diálogo no existe, lo creamos de manera programática
        oDialog = sap.ui.xmlfragment("com.inv.sapfiori.view.CreateUserDialog", this);
        this.getView().addDependent(oDialog);
      }
      oDialog.open(); // Abrir el diálogo
    },

    /**
     * Cierra el diálogo de creación de usuario
     */
    onCloseCreateUserDialog: function () {
      this.byId("createUserDialog").close();
    },

    /**
     * Confirma la creación de un nuevo usuario mediante POST
     * Recopila todos los datos del formulario y los envía al servidor
     */
    onConfirmCreateUser: function () {
      // Obtener los valores de los campos del formulario
      var userId = this.byId("createUserIdInput").getValue();
      var userName = this.byId("createUserNameInput").getValue();
      var alias = this.byId("createUserAliasInput").getValue();
      var email = this.byId("createUserEmailInput").getValue();
      var phone = this.byId("createUserPhoneInput").getValue();
      var department = this.byId("createUserDepartmentInput").getValue();
      var userFunction = this.byId("createUserFunctionInput").getValue();
      var street = this.byId("createUserStreetInput").getValue();
      var postalCode = this.byId("createUserPostalCodeInput").getValue();
      var city = this.byId("createUserCityInput").getValue();
      var state = this.byId("createUserStateInput").getValue();
      var country = this.byId("createUserCountryInput").getValue();
      var isActive = this.byId("createUserActiveSwitch").getState();
      var oRolesContainer = this.byId("createUserRolesContainer");

      // Obtener roles desde los inputs dinámicos
      var roles = oRolesContainer.getItems().map(function (hbox) {
        var inputs = hbox.getItems();
        var roleId = inputs[0].getValue().trim();
        var roleIdSap = inputs[1].getValue().trim();

        return {
          ROLEID: roleId,
          ROLEIDSAP: roleIdSap
        };
      });

      // Construir el objeto usuario a enviar
      var userData = {
        USERID: userId,
        USERNAME: userName,
        ALIAS: alias,
        EMAIL: email,
        PHONENUMBER: phone,
        DEPARTMENT: department,
        FUNCTION: userFunction,
        STREET: street,
        POSTALCODE: postalCode,
        CITY: city,
        STATE: state,
        COUNTRY: country,
        ROLES: roles,
        DETAIL_ROW: {
          ACTIVED: isActive,
          DELETED: false,
          DETAIL_ROW_REG: [
            {
              CURRENT: true,
              REGDATE: new Date(),
              REGUSER: "current_user" // Cambiar por el usuario actual si está disponible
            }
          ]
        }
      };

      // Hacer el fetch POST para enviar los datos al servidor
      fetch("http://localhost:3033/api/sec/usersroles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: "user", user: userData })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Error al crear el usuario");
          }
          return response.json();
        })
        .then(function (data) {
          MessageToast.show("Usuario creado exitosamente!");
          this.onCloseCreateUserDialog();
          this._loadUsersData(); // Recargar los datos de usuarios
        }.bind(this))
        .catch(function (error) {
          MessageBox.error(error.message || "Ocurrió un error al crear el usuario");
        });
    },

    /**
     * ============================================================================
     * OPERACIONES POST - CREACIÓN DE ROLES
     * ============================================================================
     */
    
    /**
     * Confirma la creación de un nuevo rol mediante POST
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

      // Hacer el fetch POST para enviar los datos al servidor
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
            this._refreshRolesData(); // Recargar los datos
          } else {
            MessageToast.show("Error al crear el rol.");
          }
        })
        .catch(error => {
          console.error("Error:", error);
          MessageToast.show("Hubo un error al crear el rol.");
        });
    },

    /**
     * ============================================================================
     * OPERACIONES DELETE - ELIMINACIÓN DE ROLES
     * ============================================================================
     */
    
    /**
     * Maneja la eliminación de un rol existente mediante POST con acción delete
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

      // Hacer fetch POST con acción delete
      fetch("http://localhost:3033/api/sec/usersroles/delete", {
        method: "POST",
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
          this._refreshRolesData(); // Recargar los datos
        })
        .catch(error => {
          MessageBox.error(error.message || "Ocurrió un error al eliminar el rol");
        });
    },
    
    /**
     * ============================================================================
     * OPERACIONES UPDATE - UPDETEAR DE ROLES
     * ============================================================================
     */

    onActualizarRol: function () {
      const oView = this.getView();
      const oTable = oView.byId("tablaRoles");
      const oSelectedItem = oTable.getSelectedItem();

      if (!oSelectedItem) {
        sap.m.MessageToast.show("Seleccione un rol para actualizar.");
        return;
      }

      const oContext = oSelectedItem.getBindingContext("roles");
      const sRoleId = oContext.getProperty("ROLEID");

      this._loadRoleData(sRoleId);
    },

    _loadRoleData: async function (sRoleId) {
      const oView = this.getView();
      const oDialog = oView.byId("updateRoleDialog");
      const oPrivContainer = oView.byId("updatePrivilegesContainer");

      // Limpiar contenedor
      oPrivContainer.removeAllItems();

      try {
        const response = await fetch(`http://localhost:3033/api/sec/usersroles/Role(ROLEID='${sRoleId}')`);
        if (!response.ok) throw new Error("No se pudo obtener el rol");

        const data = await response.json();

        // Llenar campos
        oView.byId("updateRoleIdInput").setValue(data.ROLEID);
        oView.byId("updateRoleNameInput").setValue(data.ROLENAME || "");
        oView.byId("updateRoleDescriptionInput").setValue(data.DESCRIPTION || "");
        oView.byId("updateRoleActiveSwitch").setState(data.DETAIL_ROW?.ACTIVED ?? false);

        // Agregar privilegios
        data.PRIVILEGES.forEach(priv => {
          // @ts-ignore
          const oHBox = new sap.m.HBox({
            items: [
              new sap.m.Input({
                value: priv.PROCESSID,
                placeholder: "Process ID",
                width: "80%",
                editable: true
              }),
              new sap.m.Input({
                value: priv.PRIVILEGEID.join(", "),
                placeholder: "Privilege IDs (comma-separated)",
                width: "80%",
                editable: true
              })
            ],
            justifyContent: "SpaceBetween",
            alignItems: "Center",
            width: "100%",
            class: "sapUiSmallMarginBottom"
          });
          oPrivContainer.addItem(oHBox);
        });

        oDialog.open();

      } catch (err) {
        console.error(err);
        sap.m.MessageToast.show("Error cargando datos del rol.");
      }
    },
    onCloseUpdateRoleDialog: function () {
      const oDialog = this.getView().byId("updateRoleDialog");
      if (oDialog) {
        oDialog.close();
      }
    },
    onConfirmUpdateRole: async function () {
      const oView = this.getView();

      // Obtener datos del formulario
      const roleId = oView.byId("updateRoleIdInput").getValue();
      const roleName = oView.byId("updateRoleNameInput").getValue();
      const description = oView.byId("updateRoleDescriptionInput").getValue();
      const isActive = oView.byId("updateRoleActiveSwitch").getState();
      const oPrivContainer = oView.byId("updatePrivilegesContainer");

      // Obtener privilegios desde los inputs dinámicos
      const privileges = oPrivContainer.getItems().map(hbox => {
        const inputs = hbox.getItems();
        const processId = inputs[0].getValue().trim();
        const privilegeIds = inputs[1].getValue().split(",").map(p => p.trim()).filter(p => p);

        return {
          PROCESSID: processId,
          PRIVILEGEID: privilegeIds
        };
      });

      const roleData = {
        ROLEID: roleId,
        ROLENAME: roleName,
        DESCRIPTION: description,
        PRIVILEGES: privileges
      };

      try {
        const response = await fetch("http://localhost:3033/api/sec/usersroles/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "role",
            role: roleData
          })
        });

        // Intentamos obtener el cuerpo JSON de la respuesta
        const data = await response.json().catch(e => {
          console.error("Error al parsear la respuesta JSON:", e);
          return null;
        });

        if (!response.ok) {
          // El servidor respondió con un error, pero podemos acceder a los datos del error
          throw data;
        }

        if (data && data.success) {
          sap.m.MessageToast.show("Rol actualizado exitosamente.");
          this.getView().byId("updateRoleDialog").close();
        this._loadUsersData(); // Recargar los datos de usuarios
    
        } else {
          sap.m.MessageToast.show("No se realizaron cambios.");
        }

      } catch (err) {
        console.error("Error capturado:", err);

        // Manejar la estructura de error específica del backend
        if (err && err.error) {
          const errorDetails = err.error;
          sap.m.MessageBox.error(`Error: ${errorDetails.message}\n${errorDetails.target}`);
        } else {
          // Error genérico para casos no estructurados
          sap.m.MessageBox.error("Ocurrió un error al actualizar el rol.");
        }
      }
    },

    /**
     * ============================================================================
     * OPERACIONES UPDATE - ACTUALIZACIÓN DE USUARIOS
     * ============================================================================
     */

    /**
     * Maneja la apertura del diálogo para actualizar un usuario
     * Carga los datos del usuario seleccionado desde la API y los muestra en el formulario
     */
    onActualizarUsuario: function () {
      const oView = this.getView();
      const oTable = oView.byId("tablaUsuarios");
      const oSelectedItem = oTable.getSelectedItem();

      if (!oSelectedItem) {
        sap.m.MessageToast.show("Seleccione un usuario para actualizar.");
        return;
      }

      const oContext = oSelectedItem.getBindingContext("users");
      const sUserId = oContext.getProperty("USERID");

      this._loadUserData(sUserId);
    },

    /**
     * Carga los datos del usuario seleccionado desde la API
     * y los muestra en el formulario del diálogo de actualización
     */
    _loadUserData: async function (sUserId) {
      const oView = this.getView();
      const oDialog = oView.byId("updateUserDialog");
      const oRolesContainer = oView.byId("updateUserRolesContainer");

      // Limpiar contenedor de roles
      oRolesContainer.removeAllItems();

      try {
        const response = await fetch(`http://localhost:3033/api/sec/usersroles/Users(USERID='${sUserId}')`);
        if (!response.ok) throw new Error("No se pudo obtener el usuario");

        const data = await response.json();

        // Llenar campos del formulario
        oView.byId("updateUserIdInput").setValue(data.USERID);
        oView.byId("updateUserNameInput").setValue(data.USERNAME || "");
        oView.byId("updateUserAliasInput").setValue(data.ALIAS || "");
        oView.byId("updateUserEmailInput").setValue(data.EMAIL || "");
        oView.byId("updateUserPhoneInput").setValue(data.PHONENUMBER || "");
        oView.byId("updateUserDepartmentInput").setValue(data.DEPARTMENT || "");
        oView.byId("updateUserFunctionInput").setValue(data.FUNCTION || "");
        oView.byId("updateUserStreetInput").setValue(data.STREET || "");
        oView.byId("updateUserPostalCodeInput").setValue(data.POSTALCODE || "");
        oView.byId("updateUserCityInput").setValue(data.CITY || "");
        oView.byId("updateUserStateInput").setValue(data.STATE || "");
        oView.byId("updateUserCountryInput").setValue(data.COUNTRY || "");
        oView.byId("updateUserActiveSwitch").setState(data.DETAIL_ROW?.ACTIVED ?? false);

        // Agregar roles al contenedor
        data.ROLES.forEach(role => {
          const oHBox = new sap.m.HBox({
            items: [
              new sap.m.Input({
                value: role.ROLEID,
                placeholder: "Role ID",
                width: "50%",
                editable: true
              }),
              new sap.m.Input({
                value: role.ROLEIDSAP,
                placeholder: "Role ID SAP",
                width: "50%",
                editable: true
              })
            ]
          });
          oRolesContainer.addItem(oHBox);
        });

        oDialog.open();

      } catch (err) {
        console.error(err);
        sap.m.MessageToast.show("Error cargando datos del usuario.");
      }
    },

    /**
     * Cierra el diálogo de actualización de usuario
     */
    onCloseUpdateUserDialog: function () {
      const oDialog = this.getView().byId("updateUserDialog");
      if (oDialog) {
        oDialog.close();
      }
    },

    /**
     * Confirma la actualización del usuario y envía los datos al servidor
     */
    onConfirmUpdateUser: async function () {
      const oView = this.getView();

      // Obtener datos del formulario
      const userId = oView.byId("updateUserIdInput").getValue();
      const userName = oView.byId("updateUserNameInput").getValue();
      const alias = oView.byId("updateUserAliasInput").getValue();
      const email = oView.byId("updateUserEmailInput").getValue();
      const phone = oView.byId("updateUserPhoneInput").getValue();
      const department = oView.byId("updateUserDepartmentInput").getValue();
      const userFunction = oView.byId("updateUserFunctionInput").getValue();
      const street = oView.byId("updateUserStreetInput").getValue();
      const postalCode = oView.byId("updateUserPostalCodeInput").getValue();
      const city = oView.byId("updateUserCityInput").getValue();
      const state = oView.byId("updateUserStateInput").getValue();
      const country = oView.byId("updateUserCountryInput").getValue();
      const isActive = oView.byId("updateUserActiveSwitch").getState();
      const oRolesContainer = oView.byId("updateUserRolesContainer");

      // Obtener roles desde los inputs dinámicos
      const roles = oRolesContainer.getItems().map(hbox => {
        const inputs = hbox.getItems();
        const roleId = inputs[0].getValue().trim();
        const roleIdSap = inputs[1].getValue().trim();

        return {
          ROLEID: roleId,
          ROLEIDSAP: roleIdSap
        };
      });

      const userData = {
        USERID: userId,
        USERNAME: userName,
        ALIAS: alias,
        EMAIL: email,
        PHONENUMBER: phone,
        DEPARTMENT: department,
        FUNCTION: userFunction,
        STREET: street,
        POSTALCODE: postalCode,
        CITY: city,
        STATE: state,
        COUNTRY: country,
        ROLES: roles,
        DETAIL_ROW: {
          ACTIVED: isActive
        }
      };

      try {
        const response = await fetch("http://localhost:3033/api/sec/usersroles/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "user",
            user: userData
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Error al actualizar el usuario");

        sap.m.MessageToast.show("Usuario actualizado exitosamente.");
        this.getView().byId("updateUserDialog").close();
        this.onRefreshUsers(); // Actualiza la tabla de usuarios

      } catch (err) {
        console.error(err);
        sap.m.MessageBox.error(err.message || "Ocurrió un error al actualizar el usuario.");
      }
    },

    /**
     * ============================================================================
     * OPERACIONES DELETE - ELIMINACIÓN DE USUARIOS
     * ============================================================================
     */

    /**
     * Maneja la eliminación de un usuario existente mediante POST con acción delete
     * Obtiene el usuario seleccionado en la tabla
     * Confirma la eliminación y actualiza la lista si es exitosa
     * Muestra mensajes apropiados en caso de éxito o error
     */
    onEliminarUsuario: function () {
      var oTable = this.byId("tablaUsuarios");
      var oContext = oTable.getSelectedItem()?.getBindingContext("users");

      if (!oContext) {
        MessageToast.show("Por favor, seleccione un usuario para eliminar.");
        return;
      }

      var sPath = oContext.getPath();
      var iIndex = parseInt(sPath.split("/")[2], 10);
      var aUsuarios = this.getView().getModel("users").getProperty("/usuarios");
      var userID = aUsuarios[iIndex].USERID;

      // Mostrar mensaje de eliminando
      MessageToast.show("Eliminando usuario...");

      // Hacer fetch POST con acción delete
      fetch("http://localhost:3033/api/sec/usersroles/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "user",
          id: userID
        })
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            const errorMsg = data?.error?.message || data?.message || "Error desconocido al eliminar el usuario";
            throw new Error(errorMsg);
          }

          MessageToast.show("Usuario eliminado con éxito");

          // Refrescar los datos desde la API
          this._loadUsersData(); // Recargar los datos
        })
        .catch(error => {
          MessageBox.error(error.message || "Ocurrió un error al eliminar el usuario");
        });
    }

  });
});
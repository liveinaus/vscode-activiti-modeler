/* eslint-env browser */

/* global acquireVsCodeApi */

import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";

import "./bpmn-editor.css";

import BpmnJS from "bpmn-js/lib/Modeler";

import activitiModdle from "activiti-bpmn-moddle/resources/activiti";
import activitiExtensionModule from "activiti-bpmn-moddle/lib";

import { BpmnPropertiesPanelModule } from "bpmn-js-properties-panel";

import propertiesProviderModule from "activiti-bpmn-properties-provider";

// import BpmnColorPickerModule from "bpmn-js-color-picker";
import KeyboardModule from "./features/keyboard";

/**
 * @type { import('vscode') }
 */
const vscode = acquireVsCodeApi();

// const modeler = new BpmnJS({
//   additionalModules: [
//     // KeyboardModule,
//     // BpmnColorPickerModule,
//     // activitiExtensionModule,
//     // propertiesPanelModule,
//     BpmnPropertiesPanelModule,
//     BpmnPropertiesProviderModule,
//     CamundaPlatformPropertiesProviderModule,
//   ],
//   keyboard: {
//     bindTo: document,
//   },
//   //   moddleExtensions: {
//   //     activiti: activitiModdle,
//   //   },
//   container: "#canvas",
//   propertiesPanel: {
//     parent: "#properties-panel",
//   },
// });

const modeler = new BpmnJS({
  container: "#canvas",
  keyboard: {
    bindTo: document,
  },
  propertiesPanel: {
    parent: "#properties-panel",
  },
  additionalModules: [
    KeyboardModule,
    // BpmnColorPickerModule,
    BpmnPropertiesPanelModule,
    propertiesProviderModule,
    activitiExtensionModule,
  ],
  moddleExtensions: {
    activiti: activitiModdle,
  },
});

modeler.on("import.done", (event) => {
  return vscode.postMessage({
    type: "import",
    error: event.error?.message,
    warnings: event.warnings.map((warning) => warning.message),
    idx: -1,
  });
});

modeler.on("commandStack.changed", () => {
  /**
   * @type { import('diagram-js/lib/command/CommandStack').default }
   */
  const commandStack = modeler.get("commandStack");

  return vscode.postMessage({
    type: "change",
    idx: commandStack._stackIdx,
  });
});

// handle messages from the extension
window.addEventListener("message", async (event) => {
  const { type, body, requestId } = event.data;

  switch (type) {
    case "init":
      if (!body.content) {
        return modeler.createDiagram();
      } else {
        return modeler.importXML(body.content);
      }

    case "update": {
      if (body.content) {
        return modeler.importXML(body.content);
      }

      if (body.undo) {
        return modeler.get("commandStack").undo();
      }

      if (body.redo) {
        return modeler.get("commandStack").redo();
      }

      break;
    }

    case "triggerAction":
      return modeler.get("editorActions").trigger(body.action, body.options);

    case "getText":
      return modeler.saveXML({ format: true }).then(({ xml }) => {
        return vscode.postMessage({
          type: "response",
          requestId,
          body: xml,
        });
      });
  }
});

// signal to VS Code that the webview is initialized
vscode.postMessage({ type: "ready" });

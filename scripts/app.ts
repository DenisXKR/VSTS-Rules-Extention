/// <reference types="vss-web-extension-sdk" />

import * as WitExtensionContracts from "TFS/WorkItemTracking/ExtensionContracts";
import { RulesEngine } from "./rulesEngine";

let provider: Object = () => {

    let rulesEngine: RulesEngine;

    return {
        onLoaded: (args: WitExtensionContracts.IWorkItemLoadedArgs): void => {
            rulesEngine = new RulesEngine(args.id);
        },
        onFieldChanged: (args: WitExtensionContracts.IWorkItemFieldChangedArgs): void => {
            if (rulesEngine) {
                rulesEngine.OnChanged(args);
            }
        },
        onRefreshed: (args: WitExtensionContracts.IWorkItemChangedArgs): void => {
            if (rulesEngine) {
                rulesEngine.updateState();
            }
        },
        onReset: (args: WitExtensionContracts.IWorkItemChangedArgs): void => {
            if (rulesEngine) {
                rulesEngine.updateState();
            }
        },
        onSaved: (args: WitExtensionContracts.IWorkItemChangedArgs): void => {
            if (rulesEngine) {
                rulesEngine.updateState();
            }
        },
        onUnloaded: (args: WitExtensionContracts.IWorkItemChangedArgs): void => {
            if (rulesEngine) {
                rulesEngine.updateState();
            }
        }
    };
};

VSS.register(VSS.getContribution().id, provider);
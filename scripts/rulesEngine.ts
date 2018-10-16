import * as WitService from "TFS/WorkItemTracking/Services";
import * as WitExtensionContracts from "TFS/WorkItemTracking/ExtensionContracts";
import * as WitContracts from "TFS/WorkItemTracking/Contracts";
import RestClient = require("TFS/WorkItemTracking/RestClient");
import { RuleModel, ActionModel, ConditionModel, TransitionModel, SettingsModel, ProjectModel } from "./models";
import { IConditionCheckerList, IActionDelegateList, GroupFlag, FieldList } from "./dispatchers";

export class RulesEngine {

    protected id: number;
    protected rules: RuleModel[] = [];
    protected service: WitService.IWorkItemFormService;
    protected conditionChecker: IConditionCheckerList;
    protected actionDelegateList: IActionDelegateList;
    protected settingsModel: SettingsModel = new SettingsModel();
    protected transitions: TransitionModel[] = [];
    protected originaFields: FieldList;
    protected currentFields: FieldList;

    private restClient: RestClient.WorkItemTrackingHttpClient4_1;
    private getData: IPromise<any>;
    private getWorkItemPromise: IPromise<any>;
    private getServicePromise: IPromise<any>;
    private makeRequiredFlag: boolean = false;
    private preventFireEvent: boolean = false;
    private projectDisabled: boolean = true;
    private fixedDateField: string = "FixedDate";
    private projectName: string;


    constructor(id: number) {
        this.id = id;

        this.restClient = RestClient.getClient();
        this.getWorkItemPromise = this.restClient.getWorkItem(this.id).then((workItem: WitContracts.WorkItem) => {
            this.projectName = workItem.fields["System.TeamProject"];
            this.originaFields = workItem.fields;
            this.currentFields = $.extend({}, workItem.fields);
            this.preventFireEvent = false;
        });

        this.getData = $.getJSON("rules.json")
            .done((data: any) => {
                this.rules = data.rules;
                data.settings.forEach(item => {
                    this.settingsModel[item.Name] = new ProjectModel(item.Dm, item.Qa, item.Enable);
                });

                this.transitions = data.transitions;
            }).promise();

        this.getServicePromise = WitService.WorkItemFormService.getService().then(
            (service: WitService.IWorkItemFormService) => {
                this.service = service;
                this.getData.then(() => {
                    this.ProjectEnableCheck();
                });
            });

        this.conditionChecker = this.GetCondition();
        this.actionDelegateList = this.GetActions();
    }

    public updateState(): void {
        this.getWorkItemPromise = this.restClient.getWorkItem(this.id).then((workItem: WitContracts.WorkItem) => {
            this.projectName = workItem.fields["System.TeamProject"];
            this.originaFields = workItem.fields;
            this.currentFields = $.extend({}, workItem.fields);
            this.preventFireEvent = false;
            this.ProjectEnableCheck();
        });
    }

    public OnChanged(args: WitExtensionContracts.IWorkItemFieldChangedArgs): void {
        if (this.preventFireEvent || this.projectDisabled) {
            return;
        }

        Promise.all([this.getData, this.getWorkItemPromise, this.getServicePromise]).then(() => {
            this.makeRequiredFlag = false;
            let fields: FieldList = args.changedFields;
            this.currentFields = $.extend(this.currentFields, fields);
            if (this.originaFields["System.State"] !== this.currentFields["System.State"]) {
                if (!this.TransitionValidation()) {
                    return;
                }
            }

            this.RulesHandling();
        });
    }

    protected ProjectEnableCheck(): void {
        if (this.settingsModel[this.projectName] &&
            this.settingsModel[this.projectName].Enable === false) {
            this.service.setError("This project is closed");
            this.projectDisabled = true;
        } else {
            this.service.clearError();
            this.projectDisabled = false;
        }
    }

    protected RulesHandling(): void {
        let groups: GroupFlag = {};
        for (let i: number = 0; i < this.rules.length; i++) {
            let rule: RuleModel = this.rules[i];
            if (groups[rule.Group] == null) {
                if ((rule.Projects == null) ||
                    (rule.IncludeProject && rule.Projects.indexOf(this.projectName) > -1) ||
                    (!rule.IncludeProject && rule.Projects.indexOf(this.projectName) < 0)) {
                    let ruleFlag: boolean = true;
                    rule.Conditions.forEach(condition => {
                        if (this.conditionChecker.hasOwnProperty(condition.Type)) {
                            ruleFlag = ruleFlag && this.conditionChecker[condition.Type](condition);
                        } else {
                            ruleFlag = false;
                        }
                    });

                    if (ruleFlag) {
                        let fields: IDictionaryStringTo<string> = {};
                        rule.Actions.forEach(action => {
                            if (this.actionDelegateList.hasOwnProperty(action.Type)) {
                                let newValue: string = this.actionDelegateList[action.Type](action);
                                if (newValue !== undefined && this.currentFields[action.Field] !== newValue) {
                                    this.preventFireEvent = true;
                                    fields[action.Field] = newValue;
                                    console.log("Action: " + action.Type + " of rule " + rule.Name + " applied");
                                }
                            }
                        });

                        // fixed date read only emulation
                        if (!fields[this.fixedDateField] &&
                            this.originaFields[this.fixedDateField] !== this.currentFields[this.fixedDateField]) {
                            fields[this.fixedDateField] = this.originaFields[this.fixedDateField] || null;
                        }

                        if (Object.keys(fields).length > 0) {
                            this.preventFireEvent = true;
                            this.service.setFieldValues(fields).then((value) => {
                                this.preventFireEvent = false;
                            });
                        }

                        groups[rule.Group] = true;
                    }
                }
            }
        }
    }

    protected TransitionValidation(): boolean {
        for (let n: number = 0; n < this.transitions.length; n++) {
            let t: TransitionModel = this.transitions[n];
            if (this.originaFields["System.State"] === t.From &&
                t.To.indexOf(this.currentFields["System.State"]) > -1) {
                this.service.clearError();
                return true;
            }
        }

        this.service.setError("Invalid state transfer");
        return false;
    }

    protected GetSettingsItem(selector: string): string {
        if (this.settingsModel[this.projectName]) {
            switch (selector) {
                case "dm": return this.settingsModel[this.projectName].Dm;
                case "qa": return this.settingsModel[this.projectName].Qa;
            }
        }

        return null;
    }

    protected GetActions(): IActionDelegateList {

        return {
            setValue: (action: ActionModel): any => {
                if (action.Value && action.Value.substr(0, 1) === "#") {
                    return this.GetSettingsItem(action.Value.substr(1));
                } else {
                    return action.Value;
                }
            },
            setValueCoalesce: (action: ActionModel): any => {
                let items: string[] = action.Value.split(",");
                let value: string = undefined;
                for (let n: number = 0; n < items.length && value == null; n++) {
                    let item: string = items[n];
                    let clause: string = item.substr(0, 1);
                    switch (clause) {
                        case "#": // from setting
                            value = this.GetSettingsItem(item.substr(1));
                        case "!": // from field
                            let field: string = item.substr(1);
                            if (this.currentFields[field]) {
                                value = this.currentFields[field];
                            }
                            break;

                        default: return action.Value; // data
                    }
                }

                return value;
            },
            copyValue: (action: ActionModel): any => {
                return this.currentFields[action.Value];
            },
            setCurrentTime: (action: ActionModel): any => {
                return new Date();
            },
            setCurrentUser: (action: ActionModel): any => {
                return VSS.getWebContext().user.email;
            },
            makeRequired: (action: ActionModel): any => {
                if (!this.makeRequiredFlag) {
                    if (this.currentFields[action.Field]) {
                        this.service.clearError();
                    } else {
                        this.makeRequiredFlag = true;
                        this.service.setError(action.Value);
                    }
                }

                return undefined;
            }
        };
    }

    protected GetCondition(): IConditionCheckerList {

        return {
            when: (condition: ConditionModel): boolean => {
                return (condition.Value == null) || (this.originaFields[condition.Field] !== this.currentFields[condition.Field] &&
                    condition.Value.indexOf(this.currentFields[condition.Field]) > -1);
            },
            whenValidate: (condition: ConditionModel): boolean => {
                return (condition.Value == null) || (condition.Value.indexOf(this.currentFields[condition.Field]) > -1);
            },
            was: (condition: ConditionModel): boolean => {
                return condition.Value.indexOf(this.originaFields[condition.Field]) > -1;
            },
            isNull: (condition: ConditionModel): boolean => {
                return this.currentFields[condition.Field] == null;
            },
            notNull: (condition: ConditionModel): boolean => {
                return this.currentFields[condition.Field] != null;
            }
        };
    }
}
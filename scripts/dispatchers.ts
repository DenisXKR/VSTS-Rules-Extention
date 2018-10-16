import { ActionModel, ConditionModel,  ProjectModel } from "./models";


export interface IActionDelegate {
    (action: ActionModel): any;
}

export interface IActionDelegateList {
    [key: string]: IActionDelegate;
}

export interface IConditionChecker {
    (condition: ConditionModel): boolean;
}

export interface IConditionCheckerList {
    [key: string]: IConditionChecker;
}

export type GroupFlag = {
    [key: number]: boolean;
};

export type FieldList = {
    [key: string]: any;
};




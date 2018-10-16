export class ActionModel {
    public Type: string;
    public Field: string;
    public Value: string;
}

export class ConditionModel {
    public Type: string;
    public Field: string;
    public Value: string[];
}

export class ProjectModel {
    public Dm: string;
    public Qa: string;
    public Enable: boolean;

    constructor(Dm: string, Qa: string, Enable: boolean) {
        this.Dm = Dm;
        this.Qa = Qa;
        this.Enable = Enable;
    }
}

export class RuleModel {
    public Name: string;
    public Group: number;

    public Projects: string[];
    public IncludeProject: boolean = true;
    public Conditions: ConditionModel[];
    public Actions: ActionModel[];
}

export class TransitionModel {

    public From: string;
    public To: string[];
}

export class SettingsModel {
    [key: string]: ProjectModel;
}
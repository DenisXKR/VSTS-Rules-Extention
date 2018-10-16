## vsts-rule-extention ##

#settings notation

Rules:
    Name: Rule name is used to track which of them are applied in browser debug console.

    Projects: Array of projects names this rule is applied (null - for all projects)

    IncludeProject: 
        true - the rule is applied only for projects from the list of previous settings.
        false - applied for all projects except projects list from previous settings.

    Group: Number of group the rule belong to, only one rule from each group is applied to workitem. When all conditions march to workitem rule is applied and skip all other rules from the group.
    
    Conditions:

        - when: check the new value of the field (the field value should be changed).

        - whenValidate: check the new value of the field (checking performs even this value doesn’t changed).

        - isNull: check value for null value.

        - notNull: check value for not null value.

        - was: check state of previous value.

    Actions:

        - setValue: sets value for the field (use #dm, #qa references to set value from default settings based on current project).

        - copyValue: copy value from field from "value" to field from "field".

        - setValueCoalesce: set value for field from the "value" list (comma delimited list of values) that could contain: real value, reference to the field to copy from (start with '!' symbol ), reference to config (#dm, #qa based on current project). It takes the first not null value.

        - setCurrentTime: set current time for field.

        - setCurrentUser: set current user for field.

Transitions: 

    From: current workitem state

    To: array of allowed stated to move from original state

Settings:

    Name: project name
    Dm: default development manager for this project
    Qa: default quality assurance manager for this project
    

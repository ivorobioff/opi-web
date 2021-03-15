import React, {Component, ReactElement, Fragment} from 'react';
import {Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, FormLabel, RadioGroup, Radio} from "@material-ui/core";
import {clone, cloneExcept, cloneWith, hasField, objectEmpty, readField, tryField} from "../../random/utils";
import {isBlank} from "../../validation/utils";
import FormHelperText from '@material-ui/core/FormHelperText';

export type DataFormResult = {[field: string]: any};
export type DataFormErrors = {[field: string]: any};
export type DataFormResultProvider = () => DataFormResult | null;
export type DataFormInputHandler = (value: any) => void;
export type DataFormReadyHandler = (provider: DataFormResultProvider) => void;
export type DataFormValidator = (value: any) => string | null | undefined;
export type DataFormConverter= (value: any) => any;
export type DataFormTouchHandler = () => void;
export type DataFormErrorHandler = (valid: boolean) => void;
export type DataFormValidateHandler = (result: DataFormResult) => DataFormErrors;

export interface DataFormControl {
    type: string;
    label: string;
    name: string;
    value?: any;
    disabled?: boolean;
    values?: {[key: string]: string};
    onInput?: DataFormInputHandler;
    validate?: DataFormValidator;
    required?: boolean | string;
    convertOut?: DataFormConverter;
    convertIn?: DataFormConverter;
    extra?: any;
}

export interface DataFormProps {
    className?: string;
    controls: DataFormControl[];
    errors?: {[field: string]: string};
    onReady?: DataFormReadyHandler;
    onTouch?: DataFormTouchHandler;
    onError?: DataFormErrorHandler;
    onValidate?: DataFormValidateHandler,
    autoComplete?: 'on'|'off';
    fresh?: boolean;
}

type DataFormInput = { value: any, error?: string | null | undefined};
type DataFormInputs = {[field: string]: DataFormInput}

interface DataFormState {
    inputs: DataFormInputs;
}

export type DataFormControlRenderer = (
    control: DataFormControl,
    context: DataFormRenderContext) => ReactElement;

interface DataFormRenderContext {
    onChange:(value: any) => void;
    state: DataFormState;
}

function hasError(inputs: DataFormInputs, controls: DataFormControl[]): boolean {

    let disabledControls = disabledControlNames(controls);

    return !!Object.keys(inputs)
        .find(n => inputs[n].error && disabledControls.indexOf(n) === -1);
}

function resolveValue(control: DataFormControl, context: DataFormRenderContext): any;
function resolveValue(control: DataFormControl, input: DataFormInput): any

function resolveValue(control: DataFormControl, param: DataFormRenderContext | DataFormInput): any {

    let input = hasField(param, 'state')
        ? (param as DataFormRenderContext).state.inputs[control.name]
        : param as DataFormInput;

    if (!hasField(input, 'value')) {
        return convertIn(control, control.value);
    }

    return input.value;
}

function createResult(controls: DataFormControl[], inputs: DataFormInputs): DataFormResult {
    let result: DataFormResult = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];

            if (typeof input === 'undefined') {
                result[control.name] = convertOut(control,  { value: control.value });
            } else {
                result[control.name] = convertOut(control, input);
            }
        }
    });

    return result;
}

function validateAll(controls: DataFormControl[], inputs: DataFormInputs): DataFormErrors {
    let errors: DataFormErrors = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];
            let value = resolveValue(control, input);
            let error = validate(control, value);

            if (error) {
                errors[control.name] = error;
            }
        }
    });

    return errors;
}

function resolveError(control: DataFormControl, context: DataFormRenderContext): string | null | undefined {

    if (control.disabled) {
        return undefined;
    }

    return tryField(context, `state.inputs.${control.name}.error`, undefined);
}

function renderText(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);
    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<TextField name={control.name}
                       variant={tryField(control, 'extra.variant', 'standard')}
                       type={tryField(control, 'extra.type', 'input')}
                       multiline={tryField(control, 'extra.multiline', false)}
                       error={!!error}
                       label={control.label}
                       onChange={e => context.onChange(e.target.value)}
                       value={value}
                       disabled={control.disabled}
                       helperText={error}
                       fullWidth />);
}

function renderSelect(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    const values = readField<{[key: string]: string}>(control, 'values');

    const error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<FormControl fullWidth error={!!error}>
        <InputLabel>{control.label}</InputLabel>
        <Select name={control.name}
                fullWidth
                onChange={e => context.onChange(e.target.value)}
                value={value}
                disabled={control.disabled}>
            {Object.keys(values).map((key, i) => {
                return (<MenuItem key={i} value={key}>{values[key]}</MenuItem>)
            })}
        </Select>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>);
}

function renderRadio(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    
    const values = control.values!;

    const error = resolveError(control, context);

    const value = resolveValue(control, context);
    
    return (<FormControl component="fieldset">
        <FormLabel component="legend">{control.label}</FormLabel>
        <Box mb={1}/>
        <RadioGroup name={control.name} 
                    onChange={e => context.onChange(e.target.value)} >
            {Object.keys(values).map((key, i) => {
                return (<FormControlLabel key={i} 
                    value={key} 
                    control={<Radio checked={value === key} />} 
                    label={values[key]} 
                    disabled={control.disabled} />)
            })}
        </RadioGroup>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>)
}


function renderCheckbox(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = false;
    }

    return (
        <FormControl fullWidth error={!!error}>
            <FormControlLabel control={
            <Checkbox checked={value}
                      disabled={control.disabled}
                      onChange={e => context.onChange(e.target.checked)}
                      name={control.name}
                      color="primary" />}
                              label={control.label} />
            {error && (<FormHelperText>{error}</FormHelperText>)}
        </FormControl>);
}

function validate(control: DataFormControl, value: any): string | null | undefined {
    if (isBlank(value)) {
        let required = control.required;

        if (required) {
            let message = required;

            if (typeof message !== 'string') {
                message = 'It\'s required!'
            }

            return message;
        }

        return null;
    }

    return (control.validate || (() => null))(value);
}

function uselessForConvert(value: any): boolean {
    return typeof value === 'undefined' || value === null 
        || (typeof value === 'string' && value.trim().length === 0);
}

function convertIn(control: DataFormControl, value: any): any {

    if (uselessForConvert(value)) {
        return undefined;
    }

    if (control.convertIn) {
        return control.convertIn(value);
    }

    return value;
}

function convertOut(control: DataFormControl, {value, error}: DataFormInput): any {

    if (error) {
        return value;
    }

    if (uselessForConvert(value)) {
        return undefined;
    }

    if (control.convertOut) {
        value = control.convertOut(value);
    }

    return value;
}

function assignErrors(errors: {[name: string]: string}, inputs: DataFormInputs) {
    Object.keys(errors).forEach(field => {
        let error = errors[field];

        let input = inputs[field] || { value: undefined };

        if (!input.error) {
            input.error = error;
        }

        inputs[field] = input;
    });

    return inputs;
}

function disabledControlNames(controls: DataFormControl[]): string[] {
    return controls.filter(c => c.disabled).map(c => c.name);
}

function lostControlNames(controls: DataFormControl[], inputs: DataFormInputs): string[] {
    let lostKeys = [];
    let currentKeys = controls.map(c => c.name);

    for (let key in inputs) {
        if (!currentKeys.includes(key)) {
            lostKeys.push(key);
        }
    }

    return lostKeys;
}

class DataForm extends Component<DataFormProps, DataFormState> {

    private renderers: {[name: string]: DataFormControlRenderer} = {
        'text': renderText,
        'select': renderSelect,
        'checkbox': renderCheckbox,
        'radio': renderRadio
    };

    private scheduledTasks: (() => void)[] = [];

    constructor(props: DataFormProps) {
        super(props);

        this.state = {
            inputs: {}
        };

        if (this.props.onReady) {
            this.props.onReady(() => {

                let errors = validateAll(this.props.controls, this.state.inputs);

                let result = null;

                if (objectEmpty(errors)) {
                    result = createResult(this.props.controls, this.state.inputs);

                    if (this.props.onValidate) {
                        errors = cloneExcept(this.props.onValidate(result), ...disabledControlNames(this.props.controls));
                    }
                }

                if (!objectEmpty(errors)) {
                    let inputs = clone(this.state.inputs);

                    assignErrors(errors, inputs);

                    this.setState({ inputs });

                    if (this.props.onError) {
                        this.props.onError(true);
                    }

                    result = null;
                }

                return result;
            });
        }
    }

    componentDidUpdate(prevProps: DataFormProps) {

        // assigned external errors
        if (this.props.errors !== prevProps.errors) {
            let errors = this.props.errors || {};

            let disabledControls = disabledControlNames(this.props.controls);
            let lostControls = lostControlNames(this.props.controls, this.state.inputs);

            errors = cloneExcept(errors, ...disabledControls, ...lostControls);

            let inputs = cloneExcept(this.state.inputs, ...lostControls);

            if (!objectEmpty(errors)) {
                assignErrors(errors, inputs);
                this.setState({ inputs });
            }

            if (this.props.onError) {
                this.props.onError(hasError(inputs, this.props.controls));
            }
        }

        // remove inputs for disabled and inexistent controls
        if (this.props.controls !== prevProps.controls) {

            let disabledControls = disabledControlNames(this.props.controls);
            let lostControls = lostControlNames(this.props.controls, this.state.inputs);

            this.setState({
                inputs: cloneExcept(this.state.inputs, ...disabledControls, ...lostControls)
            });
        }

        // run scheduled tasks
        this.scheduledTasks.forEach(task => task());

        this.scheduledTasks = [];

        let oldFresh = tryField(prevProps, 'fresh', true);
        let newFresh = tryField(this.props, 'fresh', true);

        if (newFresh && oldFresh !== newFresh) {
            this.setState({ inputs: {} });
        }
    }

    render() {
        const {
            controls,
            className,
            autoComplete,
            children
        } = this.props;
        
        return (<form noValidate autoComplete={autoComplete} className={className}>
            {controls.map((control, i) => {

                let renderer = readField<DataFormControlRenderer>(this.renderers, control.type);

                return (<Fragment key={i}>
                    {renderer(control, this.createRenderContext(control))}
                    { i < controls.length - 1 ? ( <Box m={2} />) : '' }
                </Fragment>);
            })}
            {children}
        </form>);
    }

    private createRenderContext(control: DataFormControl): DataFormRenderContext {
        return {
            onChange: value => {
                let error = validate(control, value);

                let input = { value, error };

                if (control.onInput) {
                    control.onInput(convertOut(control, input));
                }

                this.setState({
                    inputs: cloneWith(this.state.inputs, {
                        [control.name]: input
                    })
                });

                if (this.props.onTouch) {
                    this.props.onTouch();
                }

                this.scheduledTasks.push(() => {
                    if (this.props.onError) {

                        let lostControls = lostControlNames(this.props.controls, this.state.inputs);

                        let inputs = cloneExcept(this.state.inputs, ...lostControls);

                        // we need to check errors after controls up to date
                        this.props.onError(hasError(inputs, this.props.controls));
                    }
                });
            },
            state: this.state
        }
    }
}

export default DataForm;
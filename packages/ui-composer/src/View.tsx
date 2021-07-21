import React, { useCallback, useState } from "react";
import { Plugin } from "@webiny/plugins";
import { Element } from "./Element";

export abstract class View<THook = any> extends Element {
    private _events = new Map();
    private _hook: THook;

    constructor(id) {
        super(id);

        this.toggleGrid(false);
    }

    get hook() {
        return this._hook;
    }

    set hook(value) {
        this._hook = value;
    }

    dispatchEvent(name: string, params = {}) {
        const callbacks: CallableFunction[] = Array.from(this._events.get(name) || new Set());
        callbacks.reverse().reduce((data, cb) => cb(data), params);
    }

    addEventListener(event: string, cb: CallableFunction) {
        const callbacks = this._events.get(event) || new Set();
        callbacks.add(cb);
        this._events.set(event, callbacks);
    }
}

export abstract class ViewPlugin<T> extends Plugin {
    abstract apply(view: T): void;
}

interface ViewComponentProps {
    view: View;
    hook?: Function;
    [key: string]: any;
}

export const ViewComponent = ({ view, hook, ...props }: ViewComponentProps): React.ReactElement => {
    const [, setCount] = useState(0);

    const render = useCallback(() => {
        setCount(count => count + 1);
    }, []);

    if (hook) {
        view.hook = hook();
    }

    return <>{view.render({ ...props, render })}</>;
};

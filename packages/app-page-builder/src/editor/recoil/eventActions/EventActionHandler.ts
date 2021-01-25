import { BaseEventAction } from "./BaseEventAction";
import {
    activeElementAtom,
    contentAtom,
    elementsAtom,
    highlightElementAtom,
    pageAtom,
    pluginsAtom,
    revisionsAtom,
    sidebarAtom,
    uiAtom
} from "../modules";
import {
    connectedAtomValue,
    connectedBatchEnd,
    connectedBatchStart,
    updateConnectedValue
} from "../modules/connected";
import { PbState } from "../modules/types";
import { EventAction } from "./EventAction";

export type EventActionHandlerMetaType = {
    client: any;
};
export type EventActionHandlerConfigType = { maxEventActionsNesting: number };

export type EventActionHandlerActionCallableResponseType = {
    state?: Partial<PbState>;
    actions?: BaseEventAction[];
};
export type MutationActionCallable<T, A extends any = any> = (state: T, args?: A) => T;

export type CallableArgsType = {
    [key: string]: any;
};
export type EventActionCallableType<T extends CallableArgsType = any> = (
    state: PbState,
    meta: EventActionHandlerMetaType,
    args?: T
) =>
    | EventActionHandlerActionCallableResponseType
    | Promise<EventActionHandlerActionCallableResponseType>;

type ListType = Map<symbol, EventActionCallableType>;
type RegistryType = Map<string, ListType>;

type TargetType = { new (...args: any[]): EventAction<any> };
type UnregisterType = () => boolean;

export const executeAction = <T extends CallableArgsType = any>(
    state: PbState,
    meta: EventActionHandlerMetaType,
    action: EventActionCallableType<T>,
    args: T,
    previousResult?: EventActionHandlerActionCallableResponseType
): EventActionHandlerActionCallableResponseType => {
    const previousState = previousResult?.state || {};
    const previousActions = previousResult?.actions || [];
    const result = action(
        { ...state, ...previousState },
        meta,
        args
    ) as EventActionHandlerActionCallableResponseType;

    return {
        state: {
            ...previousState,
            ...result.state
        },
        actions: previousActions.concat(result.actions || [])
    };
};
export const executeAsyncAction = async <T extends CallableArgsType = any>(
    state: PbState,
    meta: EventActionHandlerMetaType,
    action: EventActionCallableType<T>,
    args: T,
    previousResult?: EventActionHandlerActionCallableResponseType
): Promise<EventActionHandlerActionCallableResponseType> => {
    const previousState = previousResult?.state || {};
    const previousActions = previousResult?.actions || [];
    const result = await action({ ...state, ...previousState }, meta, args);

    return {
        state: {
            ...previousState,
            ...result.state
        },
        actions: previousActions.concat(result.actions || [])
    };
};
/**
 * Usages
 * subscribing to an event: handler.on(TargetEventClass, (args) => {your code})
 * unsubscribing from an event: handler.off(id)
 * triggering an event: handler.trigger(new TargetEventClass(args))
 *
 * removing all subscriptions: handler.clearRegistry()
 */
export class EventActionHandler {
    private readonly _registry: RegistryType = new Map();
    private readonly _trackedStates: string[];
    private readonly _meta: EventActionHandlerMetaType;
    private readonly _config: EventActionHandlerConfigType;

    public get meta(): EventActionHandlerMetaType {
        return this._meta;
    }

    public get config(): EventActionHandlerConfigType {
        return this._config;
    }

    public constructor(
        trackedStates: (keyof Partial<PbState>)[] = [],
        meta: EventActionHandlerMetaType,
        config: EventActionHandlerConfigType
    ) {
        this._trackedStates = trackedStates;
        this._meta = meta;
        this._config = config;
    }

    public on(target: TargetType, callable: EventActionCallableType): UnregisterType {
        const name = this.getEventActionClassName(target);
        if (!this.has(name)) {
            this.set(name, new Map());
        }
        const events = this.get(name);
        if (this.hasCb(events, callable)) {
            throw new Error(
                `You cannot register event action "${name}" with identical function that already is registered.`
            );
        }

        const id = Symbol(`eventActionCb:${name}`);
        events.set(id, callable);
        return () => {
            return this.off(id);
        };
    }

    public async trigger<T extends CallableArgsType>(
        ev: EventAction<T>
    ): Promise<Partial<PbState>> {
        const results = await this.triggerEventAction(ev, {} as any, []);

        this.saveCallablesResults(results.state);

        return results.state;
    }

    public clearRegistry(): void {
        this._registry.clear();
    }

    private off(id: symbol): boolean {
        const registry = Array.from(this._registry.values());
        for (const list of registry) {
            if (!list.has(id)) {
                continue;
            }
            return list.delete(id);
        }
        return false;
    }

    private get(name: string): ListType {
        const list = this._registry.get(name);
        if (!list) {
            throw new Error(`There is no event action group "${name}" defined.`);
        }
        return list;
    }

    private set(name: string, list: ListType): void {
        this._registry.set(name, list);
    }

    private has(name: string): boolean {
        return this._registry.has(name);
    }

    private hasCb(list: ListType, callable: EventActionCallableType): boolean {
        const values = Array.from(list.values());
        return values.some(cb => cb === callable);
    }

    private getEventActionClassName(target: TargetType): string {
        const cls = new target();
        const name = cls.getName();
        if (!name) {
            throw new Error("Could not find class name.");
        }
        return name;
    }

    private saveCallablesResults(state: Partial<PbState>): void {
        if (Object.values(state).length === 0) {
            return;
        }
        // this is required because if we start the batch
        // there will be extra state in the undo
        // does not matter that tracked state did not change
        const setInBatch = this.isTrackedStateChanged(state);
        if (setInBatch) {
            connectedBatchStart();
        }
        if (state.ui) {
            updateConnectedValue(uiAtom, state.ui);
        }
        if (state.plugins) {
            updateConnectedValue(pluginsAtom, state.plugins);
        }
        if (state.page) {
            updateConnectedValue(pageAtom, state.page);
        }
        if (state.content) {
            updateConnectedValue(contentAtom, state.content);
        }
        if (state.elements) {
            updateConnectedValue(elementsAtom, state.elements);
        }
        if (state.activeElement) {
            updateConnectedValue(activeElementAtom, state.activeElement);
        }
        if (state.highlightElement) {
            updateConnectedValue(highlightElementAtom, state.highlightElement);
        }
        if (state.sidebar) {
            updateConnectedValue(sidebarAtom, state.sidebar);
        }

        if (setInBatch) {
            connectedBatchEnd();
        }
    }

    private isTrackedStateChanged(state: Partial<PbState>): boolean {
        return this._trackedStates.some(key => state[key] !== undefined);
    }

    private getCallableState(state: Partial<PbState>): PbState {
        return {
            sidebar: connectedAtomValue(sidebarAtom),
            activeElement: connectedAtomValue(activeElementAtom),
            highlightElement: connectedAtomValue(highlightElementAtom),
            elements: connectedAtomValue(elementsAtom),
            page: connectedAtomValue(pageAtom),
            plugins: connectedAtomValue(pluginsAtom),
            ui: connectedAtomValue(uiAtom),
            content: connectedAtomValue(contentAtom),
            revisions: connectedAtomValue(revisionsAtom),
            ...state
        };
    }

    private async triggerEventAction<T extends CallableArgsType>(
        ev: EventAction<T>,
        initialState: PbState,
        initiator: string[]
    ): Promise<EventActionHandlerActionCallableResponseType> {
        if (initiator.length >= this.config.maxEventActionsNesting) {
            throw new Error(
                `Max (${
                    this.config.maxEventActionsNesting
                }) allowed levels of nesting actions reached: ${initiator.join(" -> ")}`
            );
        }
        const name = ev.getName();
        if (!this.has(name)) {
            throw new Error(`There is no event action that is registered with name "${name}".`);
        }
        const targetCallables = this.get(name);
        const results: EventActionHandlerActionCallableResponseType = {
            state: {},
            actions: []
        };
        if (!targetCallables) {
            return results;
        }
        const args = ev.getArgs();
        const callables = Array.from(targetCallables.values());
        for (const cb of callables) {
            const r =
                (await cb(
                    this.getCallableState({ ...initialState, ...results.state }),
                    this.meta,
                    args
                )) || ({} as any);
            results.state = {
                ...results.state,
                ...(r.state || {})
            };
            results.actions.push(...(r.actions || []));
        }

        for (const action of results.actions) {
            const r = await this.triggerEventAction(
                action,
                this.getCallableState({ ...initialState, ...results.state }),
                initiator.concat([name])
            );
            results.state = {
                ...(results.state || {}),
                ...(r.state || {})
            };
        }
        return results;
    }
}

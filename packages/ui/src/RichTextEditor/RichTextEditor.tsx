import React, { useRef, useEffect, Fragment } from "react";
import EditorJS, {
    OutputData,
    OutputBlockData,
    ToolSettings,
    SanitizerConfig,
    LogLevels
} from "@editorjs/editorjs";
import { FormElementMessage } from "@webiny/ui/FormElementMessage";
import { css } from "emotion";
import classNames from "classnames";

const classes = {
    wrapper: css({
        backgroundColor: "var(--mdc-theme-background)",
        padding: "20px 16px 6px"
    }),
    label: css({
        marginBottom: "10px !important"
    }),
    disable: css({
        opacity: 0.7,
        pointerEvents: "none"
    })
};

export type OnReadyParams = { editor: EditorJS; initialData: OutputData };

export type RichTextEditorProps = {
    autofocus?: boolean;
    context?: { [key: string]: any };
    logLevel?: LogLevels;
    minHeight?: number;
    onChange?: (data: OutputBlockData[]) => void;
    onReady?: (params: OnReadyParams) => void;
    placeholder?: string;
    readOnly?: boolean;
    sanitizer?: SanitizerConfig;
    tools?: { [toolName: string]: ToolSettings };
    value?: OutputBlockData[];
    label?: string;
    description?: string;
    disabled?: boolean;
};

export const RichTextEditor = (props: RichTextEditorProps) => {
    const elementRef = useRef();
    const editorRef = useRef<EditorJS>();

    useEffect(() => {
        const { value, context, onReady, ...nativeProps } = props;
        const initialData = value ? { blocks: value } : { blocks: [] };

        editorRef.current = new EditorJS({
            ...nativeProps,
            holder: elementRef.current,
            data: initialData,
            onChange: async () => {
                const { blocks: data } = await editorRef.current.save();
                props.onChange(data);
            },
            onReady() {
                if (typeof onReady !== "function") {
                    return;
                }
                onReady({ editor: editorRef.current, initialData });
            },
            tools: Object.keys(props.tools || {}).reduce((tools, name) => {
                const tool = props.tools[name];
                tools[name] = tool;
                if (!tool.config) {
                    tool.config = { context };
                } else {
                    tool.config = { ...tool.config, context };
                }
                return tools;
            }, {})
        });
    }, []);

    const { label, description, disabled } = props;

    if (label || description || disabled) {
        return (
            <Fragment>
                <div className={classNames(classes.wrapper, { [classes.disable]: disabled })}>
                    {label && (
                        <div
                            className={classNames(
                                "mdc-text-field-helper-text mdc-text-field-helper-text--persistent",
                                classes.label
                            )}
                        >
                            {label}
                        </div>
                    )}
                    <div ref={elementRef} />
                </div>
                {description && <FormElementMessage>{description}</FormElementMessage>}
            </Fragment>
        );
    }

    return <div ref={elementRef} />;
};

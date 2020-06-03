import * as React from "react";
import { ReactComponent as CopyToClipboardIcon } from "../assets/file_copy-24px.svg";
import { IconButton } from "../index";
import { FormComponentProps } from "../../types";

export type CopyButtonProps = FormComponentProps & {
    value: string;
    showSnackbar?: (message: string) => any;
};

/**
 * Shows the icon button.
 * @param props
 * @returns {*}
 * @constructor
 */
const CopyButton = (props: CopyButtonProps) => {
    const { value, showSnackbar, ...otherProps } = props;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        showSnackbar("Succesfully copied!");
    };

    return <IconButton {...otherProps} onClick={copyToClipboard} icon={<CopyToClipboardIcon />} />;
};

export { CopyButton };

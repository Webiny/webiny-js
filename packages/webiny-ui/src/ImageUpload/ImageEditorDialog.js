// @flow
import * as React from "react";
import { ImageEditor } from "webiny-ui/ImageEditor";
import { Tooltip } from "webiny-ui/Tooltip";
import { Dialog, DialogAccept, DialogCancel, DialogFooter, DialogBody } from "webiny-ui/Dialog";

type Props = Object & { src: ?string };

class ImageEditorDialog extends React.Component<Props> {
    render() {
        const { src, onAccept, ...dialogProps } = this.props;
        return (
            <Dialog {...dialogProps}>
                {src && (
                    <ImageEditor src={src}>
                        {({ render, getCanvasDataUrl, hasActiveTool }) => (
                            <>
                                <DialogBody>{render()}</DialogBody>
                                <DialogFooter>
                                    <DialogCancel>Cancel</DialogCancel>

                                    {hasActiveTool ? (
                                        <Tooltip
                                            placement={"left"}
                                            content={
                                                <span>Please deactivate current tool to save.</span>
                                            }
                                        >
                                            <DialogAccept disabled>Save</DialogAccept>
                                        </Tooltip>
                                    ) : (
                                        <DialogAccept
                                            onClick={() => {
                                                onAccept(getCanvasDataUrl());
                                            }}
                                        >
                                            Save
                                        </DialogAccept>
                                    )}
                                </DialogFooter>
                            </>
                        )}
                    </ImageEditor>
                )}
            </Dialog>
        );
    }
}
export default ImageEditorDialog;

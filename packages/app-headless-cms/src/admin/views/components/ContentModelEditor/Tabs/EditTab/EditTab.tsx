import React, { useCallback, useState } from "react";
import { get, cloneDeep } from "lodash";
import { Icon } from "@webiny/ui/Icon";
import { ReactComponent as HandleIcon } from "@webiny/app-headless-cms/admin/icons/round-drag_indicator-24px.svg";
import { CmsEditorContentTab, FieldLayoutPosition } from "../../../../../../types";
import { i18n } from "@webiny/app/i18n";
import { useContentModelEditor } from "../../Context";
import { Center, Vertical, Horizontal } from "../../DropZone";
import Draggable from "../../Draggable";
import EditFieldDialog from "./EditFieldDialog";
import Field from "./Field";
import { rowHandle, EditContainer, fieldHandle, fieldContainer, Row, RowContainer } from "./Styled";

const t = i18n.namespace("app-headless-cms/admin/components/editor");

export const EditTab: CmsEditorContentTab = () => {
    const {
        getFields,
        insertField,
        updateField,
        deleteField,
        data,
        moveField,
        moveRow,
        getFieldPlugin
    } = useContentModelEditor();

    const [editingField, setEditingField] = useState(null);
    const [dropTarget, setDropTarget]: [FieldLayoutPosition, Function] = useState(null);

    const editField = useCallback(field => {
        setEditingField(cloneDeep(field));
    }, undefined);

    const handleDropField = useCallback((source, dropTarget) => {
        const { pos, type, ui } = source;

        if (ui === "row") {
            // Reorder rows.
            // Reorder logic is different depending on the source and target position.
            return moveRow(pos.row, dropTarget.row);
        }

        // If source pos is set, we are moving an existing field.
        if (pos) {
            const fieldId = data.layout[pos.row][pos.index];
            return moveField({ field: fieldId, position: dropTarget });
        }

        const plugin = getFieldPlugin({ type });
        editField(plugin.field.createField());
        setDropTarget(dropTarget);
    }, null);

    const fields: Array<any> = getFields(true);

    return (
        <EditContainer>
            {fields.length === 0 && (
                <Center onDrop={item => handleDropField(item, { row: 0, index: 0 })}>
                    {t`Drop your first field here`}
                </Center>
            )}

            {fields.map((row, index) => (
                <Draggable beginDrag={{ ui: "row", pos: { row: index } }} key={index}>
                    {(
                        {
                            drag,
                            isDragging
                        } /* RowContainer start - includes drag handle, drop zones and the Row itself. */
                    ) => (
                        <RowContainer style={{ opacity: isDragging ? 0.3 : 1 }}>
                            <div className={rowHandle} ref={drag}>
                                <Icon icon={<HandleIcon />} />
                            </div>
                            <Horizontal
                                data-testid={`cms-editor-row-droppable-top-${index}`}
                                onDrop={item => handleDropField(item, { row: index, index: null })}
                            />
                            {/* Row start - includes field drop zones and fields */}
                            <Row>
                                {row.map((field, fieldIndex) => (
                                    <Draggable
                                        key={fieldIndex}
                                        beginDrag={{
                                            ui: "field",
                                            type: field.type,
                                            pos: {
                                                row: index,
                                                index: fieldIndex
                                            }
                                        }}
                                    >
                                        {({ drag }) => (
                                            <div className={fieldContainer} ref={drag}>
                                                <Vertical
                                                    onDrop={item =>
                                                        handleDropField(item, {
                                                            row: index,
                                                            index: fieldIndex
                                                        })
                                                    }
                                                    isVisible={item =>
                                                        item.ui === "field" &&
                                                        (row.length < 4 ||
                                                            get(item, "pos.row") === index)
                                                    }
                                                />

                                                <div className={fieldHandle}>
                                                    <Field
                                                        field={field}
                                                        onEdit={editField}
                                                        onDelete={deleteField}
                                                    />
                                                </div>

                                                {/* Field end */}
                                                {fieldIndex === row.length - 1 && (
                                                    <Vertical
                                                        last
                                                        isVisible={item =>
                                                            item.ui === "field" &&
                                                            (row.length < 4 ||
                                                                get(item, "pos.row") === index)
                                                        }
                                                        onDrop={item =>
                                                            handleDropField(item, {
                                                                row: index,
                                                                index: fieldIndex + 1
                                                            })
                                                        }
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                            </Row>
                            {/* Row end */}
                            {index === fields.length - 1 && (
                                <Horizontal
                                    data-testid={`cms-editor-row-droppable-bottom-${index}`}
                                    last
                                    onDrop={item =>
                                        handleDropField(item, {
                                            row: index + 1,
                                            index: null
                                        })
                                    }
                                />
                            )}
                        </RowContainer>
                    )}
                </Draggable>
            ))}

            <EditFieldDialog
                field={editingField}
                onClose={editField}
                onSubmit={data => {
                    if (data.id) {
                        updateField(data);
                    } else {
                        insertField(data, dropTarget);
                    }
                    editField(null);
                }}
            />
        </EditContainer>
    );
};

import React from "react";
import { i18n } from "@webiny/app/i18n";
import { CmsEditorFieldRendererPlugin } from "~/types";
import DynamicSection from "../DynamicSection";
import { Fields } from "~/admin/components/ContentEntryForm/Fields";
import { ReactComponent as DeleteIcon } from "~/admin/icons/close.svg";
import { IconButton } from "@webiny/ui/Button";
import { Cell } from "@webiny/ui/Grid";
import { FormElementMessage } from "@webiny/ui/FormElementMessage";
import { Typography } from "@webiny/ui/Typography";
import Accordion from "~/admin/plugins/fieldRenderers/Accordion";
import {
    fieldsWrapperStyle,
    dynamicSectionTitleStyle,
    dynamicSectionGridStyle,
    fieldsGridStyle
} from "./StyledComponents";

const t = i18n.ns("app-headless-cms/admin/fields/text");

const plugin: CmsEditorFieldRendererPlugin = {
    type: "cms-editor-field-renderer",
    name: "cms-editor-field-renderer-objects",
    renderer: {
        rendererName: "objects",
        name: t`Objects`,
        description: t`Renders a set of fields.`,
        canUse({ field }) {
            return field.type === "object" && field.multipleValues;
        },
        render(props) {
            const { field, contentModel } = props;

            return (
                <DynamicSection
                    {...props}
                    emptyValue={{}}
                    showLabel={false}
                    renderTitle={value => (
                        <Cell span={12} className={dynamicSectionTitleStyle}>
                            <Typography use={"headline5"}>
                                {`${field.label} ${value.length ? `(${value.length})` : ""}`}
                            </Typography>
                            {field.helpText && (
                                <FormElementMessage>{field.helpText}</FormElementMessage>
                            )}
                        </Cell>
                    )}
                    gridClassName={dynamicSectionGridStyle}
                >
                    {({ Bind, bind, index }) => (
                        <Accordion
                            title={`${props.field.label} #${index + 1}`}
                            action={
                                index > 0 && (
                                    <IconButton
                                        icon={<DeleteIcon />}
                                        onClick={() => bind.field.removeValue(index)}
                                    />
                                )
                            }
                            // Open first Accordion by default
                            defaultValue={index === 0}
                        >
                            <Cell span={12} className={fieldsWrapperStyle}>
                                <Fields
                                    Bind={Bind}
                                    {...bind.index}
                                    contentModel={contentModel}
                                    fields={field.settings.fields}
                                    layout={field.settings.layout}
                                    gridClassName={fieldsGridStyle}
                                />
                            </Cell>
                        </Accordion>
                    )}
                </DynamicSection>
            );
        }
    }
};

export default plugin;

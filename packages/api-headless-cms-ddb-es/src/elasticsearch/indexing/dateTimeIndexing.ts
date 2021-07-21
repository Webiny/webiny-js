import { CmsContentModelDateTimeField } from "@webiny/api-headless-cms/types";
import { CmsModelFieldToElasticsearchPlugin } from "../../types";

const convertTimeToNumber = (time?: string): number | null => {
    if (!time) {
        return null;
    }
    const [hours, minutes, seconds = 0] = time.split(":").map(Number);
    return hours * 60 * 60 + minutes * 60 + seconds;
};

const convertNumberToTime = (value?: number): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    // TODO remove when v5 goes out
    // this is a fix for pre beta.5
    if (String(value).match(/^([0-9]{2}):([0-9]{2})/) !== null) {
        return String(value);
    }
    //
    const hours = Math.floor(value / 60 / 60);

    const minutes = Math.floor((value - hours * 60 * 60) / 60);

    const seconds = Math.floor(value - hours * 60 * 60 - minutes * 60);

    return [hours, minutes, seconds].map(v => String(v).padStart(2, "0")).join(":");
};

const convertValueFromIndex = (
    value: string | number,
    field: CmsContentModelDateTimeField
): string | null => {
    const type = field.settings.type;
    if (type === "time") {
        return convertNumberToTime(value as number);
    } else if (!value) {
        return null;
    } else if (type === "dateTimeWithTimezone") {
        return value as string;
    } else if (type === "date") {
        const dateValue = new Date(value);
        return dateValue.toISOString().substr(0, 10);
    }
    return new Date(value).toISOString();
};

const convertValueToIndex = (value: string, field: CmsContentModelDateTimeField) => {
    if (!value) {
        return null;
    } else if (field.settings.type === "time") {
        return convertTimeToNumber(value);
    }
    return value;
};

export default (): CmsModelFieldToElasticsearchPlugin => ({
    type: "cms-model-field-to-elastic-search",
    name: "cms-model-field-to-elastic-search-datetime",
    fieldType: "datetime",
    unmappedType: () => {
        return "date";
    },
    toIndex({ field, storageValue }) {
        const dateValue = convertValueToIndex(storageValue, field as CmsContentModelDateTimeField);
        return {
            value: dateValue
        };
    },
    fromIndex({ field, value }) {
        return convertValueFromIndex(value, field as CmsContentModelDateTimeField);
    }
});

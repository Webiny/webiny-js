import WebinyError from "@webiny/error";
import { CmsModelFieldToStoragePlugin } from "@webiny/api-headless-cms/types";
import { gzip, ungzip } from "@webiny/api-headless-cms/utils";

export type OriginalValue = string | string[] | Record<string, any>;

export interface StorageValue {
    compression: string;
    value: string | string[];
}

const GZIP = "gzip";
const TO_STORAGE_ENCODING = "base64";
const FROM_STORAGE_ENCODING = "utf8";

const convertToBuffer = value => {
    if (typeof value === "string") {
        return Buffer.from(value, TO_STORAGE_ENCODING);
    }
    return value;
};

export default (): CmsModelFieldToStoragePlugin<OriginalValue, StorageValue> => {
    return {
        type: "cms-model-field-to-storage",
        name: "cms-model-field-to-storage-long-text",
        fieldType: "long-text",
        async fromStorage({ field, value: storageValue }) {
            if (!storageValue || typeof storageValue !== "object") {
                return storageValue;
            }
            /**
             * This is to circumvent a bug introduced with 5.8.0 storage operations.
             * TODO: remove with 5.9.0 upgrade
             */
            if (storageValue.hasOwnProperty("compression") === false) {
                return storageValue;
            }
            const { compression, value } = storageValue;
            if (!compression) {
                throw new WebinyError(
                    `Missing compression in "fromStorage" function in field "${
                        field.fieldId
                    }": ${JSON.stringify(storageValue)}.`,
                    "MISSING_COMPRESSION",
                    {
                        value: storageValue
                    }
                );
            }
            if (compression !== GZIP) {
                throw new WebinyError(
                    `This plugin cannot transform something not compressed with "${GZIP}".`,
                    "WRONG_COMPRESSION",
                    {
                        compression
                    }
                );
            }

            /**
             * In case of field with "multipleValues", value will be an array
             */
            if (Array.isArray(value)) {
                const decompressed: string[] = [];
                for (let i = 0; i < value.length; i++) {
                    const current = convertToBuffer(value[i]);
                    const decompressedBuffer = await ungzip(current);
                    decompressed.push(decompressedBuffer.toString(FROM_STORAGE_ENCODING));
                }
                return decompressed;
            }

            const decompressedBuffer = await ungzip(convertToBuffer(value));
            return decompressedBuffer.toString(FROM_STORAGE_ENCODING);
        },
        async toStorage({ value }) {
            /**
             * There is a possibility that we are trying to compress already compressed value.
             * Introduced a bug with 5.8.0 storage operations, so just return the value to correct it.
             * TODO: remove with 5.9.0 upgrade.
             */
            if (value && value.hasOwnProperty("compression") === true) {
                return value as any;
            }

            /**
             * In case of field with "multipleValues", value will be an array
             */
            if (Array.isArray(value)) {
                // compress each item in "value"
                const compressedValues = [];
                for (let i = 0; i < value.length; i++) {
                    const current = value[i];
                    const compressed = await gzip(current);
                    const compressedValue = compressed.toString(TO_STORAGE_ENCODING);
                    compressedValues.push(compressedValue);
                }

                return {
                    compression: GZIP,
                    value: compressedValues
                };
            }

            if (typeof value !== "string") {
                return value;
            }

            const compressed = await gzip(value);
            const compressedValue = compressed.toString(TO_STORAGE_ENCODING);

            return {
                compression: GZIP,
                value: compressedValue
            };
        }
    };
};

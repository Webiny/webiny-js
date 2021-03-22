import React from "react";
import debounce from "lodash/debounce";
import { MultiAutoComplete } from "@webiny/ui/AutoComplete";
import { Link } from "@webiny/react-router";
import { i18n } from "@webiny/app/i18n";
import { useReferences } from "./useReferences";

const t = i18n.ns("app-headless-cms/admin/fields/ref");

const warn = t`Before publishing the main content entry, make sure you publish the following referenced entries: {entries}`;

function ContentEntriesMultiAutocomplete({ bind, field }) {
    const { options, setSearch, entries, loading, onChange } = useReferences({ bind, field });

    // Currently we only support 1 model in the `ref` field, so we use index 0 (this will be upgraded in the future).
    const { modelId } = field.settings.models[0];

    const entryWarning = ({ id, name, published }, index) =>
        !published && (
            <React.Fragment key={id}>
                {index > 0 && ", "}
                <Link to={`/cms/content-entries/${modelId}?id=${encodeURIComponent(id)}`}>
                    {name}
                </Link>
            </React.Fragment>
        );

    let warning = entries.filter(item => item.published === false);
    if (warning.length) {
        warning = warn({
            entries: <>{warning.map(entryWarning)}</>
        });
    }

    return (
        <MultiAutoComplete
            {...bind}
            useMultipleSelectionList
            onChange={onChange}
            loading={loading}
            value={entries}
            options={options}
            label={field.label}
            onInput={debounce(setSearch, 250)}
            description={
                <>
                    {field.helpText}
                    {warning}
                </>
            }
        />
    );
}

export default ContentEntriesMultiAutocomplete;

import richTextIndexing from "./richTextIndexing";
import defaultFieldIndexing from "./defaultFieldIndexing";
import dateTimeIndexing from "./dateTimeIndexing";
import numberIndexing from "./numberIndexing";
import longTextIndexing from "./longTextIndexing";
import objectIndexing from "./objectIndexing";

export default () => [
    dateTimeIndexing(),
    richTextIndexing(),
    defaultFieldIndexing(),
    numberIndexing(),
    longTextIndexing(),
    numberIndexing(),
    objectIndexing()
];

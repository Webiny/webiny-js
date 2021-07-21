import richTextStorage from "./storage/richText";
import dateStorage from "./storage/date";
import longTextStorage from "./storage/longText";
import plainObjectPath from "./path/plainObject";
import refPath from "./path/ref";
import datetimeTransformValue from "./transformValue/datetime";

export default () => [
    longTextStorage(),
    richTextStorage(),
    dateStorage(),
    plainObjectPath(),
    refPath(),
    datetimeTransformValue()
];

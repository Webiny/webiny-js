import { FbBuilderFieldPlugin } from "@webiny/app-headless-cms/types";
import text from "./text";
import integer from "./integer";
import float from "./float";
import number from "./number";
import boolean from "./boolean";
import dateTime from "./dateTime";
const plugins: FbBuilderFieldPlugin[] = [text, integer, float, number, boolean, dateTime];

export default plugins;

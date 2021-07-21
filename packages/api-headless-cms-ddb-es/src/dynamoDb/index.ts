import richTextStorage from "./storage/richText";
import dateStorage from "./storage/date";
import longTextStorage from "./storage/longText";

export default () => [richTextStorage(), dateStorage(), longTextStorage()];

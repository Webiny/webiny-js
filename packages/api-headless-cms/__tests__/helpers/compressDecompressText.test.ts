import { gzip, ungzip } from "../../src/utils";

const BASE64 = "base64";
const UTF8 = "utf8";

const input = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

describe(`compress and decompress text using "gzip" and "ungzip"`, () => {
    it(`should compress and decompress text stored as "base64"`, async () => {
        const compressed = await gzip(input);
        const compressedString = compressed.toString(BASE64);

        const decompressed = await ungzip(Buffer.from(compressedString, BASE64));
        const output = decompressed.toString(UTF8);

        expect(input).toEqual(output);
    });

    it(`should fail to decompress text stored as  "utf8"`, async () => {
        let error;
        try {
            const compressed = await gzip(input);
            const compressedString = compressed.toString(UTF8);
            await ungzip(Buffer.from(compressedString));
        } catch (e) {
            error = e;
        }
        expect(error.message).toEqual("incorrect header check");
    });
});

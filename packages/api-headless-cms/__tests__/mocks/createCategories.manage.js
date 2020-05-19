import { locales } from "./I18NLocales";

export default async context => {
    const { category: Category } = context.models;
    const category1 = new Category();

    const data = [
        {
            title: {
                values: [
                    { locale: locales.en.id, value: "Hardware EN" },
                    { locale: locales.de.id, value: "Hardware DE" }
                ]
            },
            slug: {
                values: [
                    { locale: locales.en.id, value: "hardware-en" },
                    { locale: locales.de.id, value: "hardware-de" }
                ]
            }
        },
        {
            title: {
                values: [
                    { locale: locales.en.id, value: "A Category EN" },
                    { locale: locales.de.id, value: "A Category DE" },
                    { locale: locales.it.id, value: "A Category IT" }
                ]
            },
            slug: {
                values: [
                    { locale: locales.en.id, value: "a-category-en" },
                    { locale: locales.de.id, value: "a-category-de" }
                    // do NOT define `it` locale value - it's on purpose
                ]
            }
        },
        {
            title: {
                values: [
                    { locale: locales.en.id, value: "B Category EN" },
                    { locale: locales.de.id, value: "B Category DE" }
                    // do NOT define `it` locale value - it's on purpose
                ]
            },
            slug: {
                values: [
                    { locale: locales.en.id, value: "b-category-en" },
                    { locale: locales.de.id, value: "b-category-de" }
                    // do NOT define `it` locale value - it's on purpose
                ]
            }
        }
    ];

    await category1.populate({ ...data[0], published: true }).save();

    const category2 = new Category();
    await category2.populate({ ...data[1], published: true }).save();

    const category3 = new Category();
    await category3.populate(data[2]).save();

    return await Promise.all(
        [category1, category2, category3].map(async model => ({
            model,
            data: await model.toStorage({ skipDifferenceCheck: true })
        }))
    );
};

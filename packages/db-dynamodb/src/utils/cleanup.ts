import { Entity } from "dynamodb-toolbox";

/**
 * The attributes defined by us or the dynamodb-toolbox library.
 * Add more attributes if necessary.
 */
const attributesToRemove = ["PK", "SK", "created", "_ct", "modified", "_mt", "entity", "_et"];

export const cleanupItem = <T>(
    entity: Entity<any>,
    item?: T & Record<string, any>,
    removeAttributes: string[] = []
): T | null => {
    if (!item) {
        return null;
    }
    const newItem = {
        ...item
    };
    const targets = attributesToRemove.concat(removeAttributes);
    const attributes = entity.schema.attributes;
    for (const key in item) {
        if (item.hasOwnProperty(key) === false) {
            continue;
        }
        if (attributes[key] && targets.includes(key) === false) {
            continue;
        }
        delete newItem[key];
    }
    return newItem;
};

export const cleanupItems = <T>(
    entity: Entity<any>,
    items: (T & Record<string, any>)[],
    removeAttributes: string[] = []
): T[] => {
    return items.map(item => cleanupItem<T>(entity, item, removeAttributes));
};

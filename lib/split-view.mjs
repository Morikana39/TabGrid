// Split membership is native. Card orientation is local because Chrome does not
// expose split orientation or proportions through the extension API.
export function splitMembers(tab, tabs) {
    if (!Number.isInteger(tab?.splitViewId) || tab.splitViewId < 0) return [];
    return tabs.filter(other => other.splitViewId === tab.splitViewId && other.windowId === tab.windowId)
        .sort((a, b) => a.index - b.index);
}

export function combineSplitItems(items, tabs) {
    const seen = new Set();
    return items.flatMap(item => {
        if (!item.tab) return [item];
        const members = splitMembers(item.tab, tabs);
        if (members.length !== 2) return [item];
        const splitKey = `${item.windowId}:${item.tab.splitViewId}`;
        if (seen.has(splitKey)) return [];
        seen.add(splitKey);
        return [{...item, key: `tab:${members[0].id}`, tab: members[0], index: members[0].index,
            members, splitViewId: item.tab.splitViewId}];
    });
}

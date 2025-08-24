/**
 * @file utilities-city-yields.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Creates detailed breakdown for city/town yields
 */
class CityYieldsEngine {
    constructor() {
        this.yields = [];
    }
    getCityYieldDetails(targetCityID) {
        const city = Cities.get(targetCityID);
        const cityYields = city?.Yields; // ...but I actually want to get details on the current city only. 
        this.yields = [];
        if (city && cityYields) {
            if (city) {
                const yields = cityYields.getYields();
                if (yields != null) {
                    yields.forEach((y, i) => {
                        const yieldInfo = GameInfo.Yields[i];
                        if (yieldInfo) {
                            this.yields.push(this.getYieldData(yieldInfo.Name, yieldInfo.YieldType, y));
                        }
                    });
                }
            }
        }
        return this.yields;
    }
    // KWG: This should be some global helper function.  Also, it is a bit incomplete
    /** Format the value into a display string
     * @param value The value to format
     * @param type	The type of the PARENT of the value.  We use the parent because that tells us how the value is being used in a calculation.
     * @param isModfier Denotes of the value is from a parent that is in the .modifer branch of a game value.  */
    getValueDisplayString(value, type, isModifier) {
        if (isModifier) {
            if (type == GameValueStepTypes.ATTRIBUTE) {
                return Locale.toNumber(value, '0.0') + "%";
            }
            else {
                if (type == GameValueStepTypes.MULTIPLY) {
                    return "x " + Locale.toNumber(value, '0.0');
                }
            }
        }
        if (type == GameValueStepTypes.PERCENTAGE) {
            return Locale.toNumber(value, '0.0') + "%";
        }
        return Locale.toNumber(value, '0.0');
    }
    getModifierStepLabel(type) {
        if (type == GameValueStepTypes.ATTRIBUTE) {
            return "LOC_ATTR_ADD_PERCENTAGE_OF_SOURCES";
        }
        else {
            if (type == GameValueStepTypes.MULTIPLY) {
                return "LOC_ATTR_MULTIPLIED_BY_SOURCES";
            }
        }
        return "LOC_ATTR_MODIFIERS";
    }
    getYieldData(label, type, attribute) {
        // Maybe get rid of the GameAttribute interface and just use TrackedValue, so we can share the very similar code that is in getStepData?
        // There is no real difference with GameAttribute and TrackedValue under the hood.
        const yieldData = {
            label: label,
            value: '',
            valueNum: attribute.value,
            valueType: attribute.type,
            type: type,
            showIcon: true,
            isNegative: (attribute.value < 0),
            isModifier: false,
            childData: []
        };
        // For top-level GameAttributes, we have a .base and optional .modifier children.
        // Have .base?
        if (attribute.base != undefined && attribute.base.value != 0 && attribute.base.steps != undefined) {
            // If we have a modifier, then show a 'sources' level
            if (attribute.modifier != undefined && attribute.modifier.value != 0) {
                const baseData = {
                    label: 'LOC_ATTR_SOURCES',
                    value: '',
                    valueNum: attribute.base.value,
                    valueType: attribute.type,
                    showIcon: false,
                    isNegative: attribute.base.value < 0,
                    isModifier: false,
                    childData: []
                };
                baseData.childData = this.getStepData(attribute.base.steps, attribute.type, false);
                yieldData.childData = yieldData.childData.concat(baseData);
            }
            else {
                // No modifiers, so put everything on this level
                yieldData.childData = yieldData.childData.concat(this.getStepData(attribute.base.steps, attribute.type, false));
            }
        }
        // Have .modifer?
        if (attribute.modifier != undefined && attribute.modifier.value != 0 && attribute.modifier.steps != undefined) {
            const modifierData = {
                label: this.getModifierStepLabel(attribute.type),
                value: '',
                valueNum: attribute.modifier.value,
                valueType: attribute.type,
                showIcon: false,
                isNegative: attribute.modifier.value < 0,
                isModifier: true,
                childData: []
            };
            modifierData.childData = this.getStepData(attribute.modifier.steps, attribute.type, true);
            yieldData.childData = yieldData.childData.concat(modifierData);
        }
        let result = yieldData;
        // Remove any redundant nodes (single children whose numeric value matches their parent)
        // NOTE: Unlike other cleanup methods, this one has a return value because it may 'replace' the root node.
        result = this.removeRedundantNodes(yieldData);
        // Cull children where one or more siblings are 'blank' (lacking a label or icon).
        this.removeBlankChildren(result);
        // Process all remaining nodes for display.
        this.prepareForDisplay(result);
        return result;
    }
    getStepData(steps, parentStepType, isModifier) {
        const childData = [];
        const stespLength = steps.length;
        for (let i = 0; i < stespLength; ++i) {
            const step = steps[i];
            if (step.value != 0) {
                // Only add this step as a new child if it was not combined with an existing child above
                const yieldData = {
                    label: (step.description) ? step.description : '',
                    value: '',
                    valueNum: step.value,
                    valueType: parentStepType,
                    showIcon: false,
                    isNegative: step.value < 0,
                    isModifier: isModifier,
                    childData: []
                };
                // Once we are in the 'steps', we can have any type.
                // So for children, we can have .base and .modifier, for things like ATTRIBUTES or MULTIPLY steps.
                // Other step types just have sub-steps off the main step
                if (step.base != undefined && step.base.steps != undefined) {
                    // If we have a modifier, then show a 'sources' level
                    if (step.modifier != undefined && step.modifier.value != 0) {
                        const baseData = {
                            label: 'LOC_ATTR_SOURCES',
                            value: '',
                            valueNum: step.base.value,
                            valueType: step.type,
                            showIcon: false,
                            isNegative: step.base.value < 0,
                            isModifier: false,
                            childData: this.getStepData(step.base.steps, step.type, false)
                        };
                        yieldData.childData.push(baseData);
                    }
                    else {
                        // No modifier, put everything on this level
                        yieldData.childData.push(...this.getStepData(step.base.steps, step.type, false));
                    }
                }
                if (step.modifier != undefined && step.modifier.value != 0 && step.modifier.steps != undefined) {
                    const modifierData = {
                        label: this.getModifierStepLabel(step.type),
                        value: '',
                        valueNum: step.modifier.value,
                        valueType: step.type,
                        showIcon: false,
                        isNegative: step.modifier.value < 0,
                        isModifier: true,
                        childData: this.getStepData(step.modifier.steps, step.type, true)
                    };
                    yieldData.childData.push(modifierData);
                }
                if (step.steps != undefined) {
                    yieldData.childData.push(...this.getStepData(step.steps, step.type, false));
                }
                childData.push(yieldData);
            }
        }
        return childData;
    }
    /**
     * Remove redundant nodes.
     * A redundant node is one in which the parent has a single child and their values/valueTypes match.
     * We must then determine whether to keep the parent or the child.  This logic is evolving and is currently as such:
     * * If the root doesn't have an associated type and isn't marked as showing an icon, use the child if the child contains a label.
     * @param root
     * @returns
     */
    removeRedundantNodes(root) {
        if (root.childData.length == 1 &&
            root.valueNum == root.childData[0].valueNum) {
            const child = this.removeRedundantNodes(root.childData[0]);
            // If the child has a label, parent with that child.
            // Otherwise remove the child and attach any grandchildren to the parent.
            if (child.label && !root.showIcon) {
                root = child;
            }
            else {
                root.childData = child.childData;
            }
        }
        else {
            // Otherwise, try and cleanup the children.
            const children = root.childData;
            const childrenLength = children.length;
            for (let i = 0; i < childrenLength; ++i) {
                const child = children[i];
                children[i] = this.removeRedundantNodes(child);
            }
        }
        return root;
    }
    /**
     * 'Blank' nodes are nodes without a label or icon to convey what exactly they mean.
     *  To provide concise information, nodes with blank children have _all_ their children removed.
     *  To prevent situations where this is too deep a cut, these nodes should be correctly labeled in GameCore.
     *
     * @param root
     */
    removeBlankChildren(root) {
        for (let i = 0; i < root.childData.length; ++i) {
            const child = root.childData[i];
            if (!child.label && !child.showIcon) {
                root.childData = [];
            }
        }
        for (let i = 0; i < root.childData.length; ++i) {
            this.removeBlankChildren(root.childData[i]);
        }
    }
    prepareForDisplay(root) {
        if (root.label) {
            root.label = Locale.compose(root.label);
        }
        root.value = this.getValueDisplayString(root.valueNum, root.valueType, root.isModifier);
        for (let i = 0; i < root.childData.length; ++i) {
            const child = root.childData[i];
            this.prepareForDisplay(child);
        }
    }
}
/**
 * Sorts an array of yields in place. Yields are sorted by "main" yield first, then by occurence in GameInfo.Yields.
 * This exists as a utility to ensure yields are displayed in a consistent order.
 *
 * @param yields YieldLike objects
 * @returns
 *
 */
export const SortYields = (yields) => {
    return yields.sort((a, b) => {
        if (a.isMainYield && !b.isMainYield) {
            return -1;
        }
        else if (!a.isMainYield && b.isMainYield) {
            return 1;
        }
        else {
            const aYieldIndex = GameInfo.Yields.findIndex(y => y.YieldType === a.yieldType);
            const bYieldIndex = GameInfo.Yields.findIndex(y => y.YieldType === b.yieldType);
            return aYieldIndex - bYieldIndex;
        }
    });
};
const CityYields = new CityYieldsEngine();
export { CityYields as default };

//# sourceMappingURL=file:///base-standard/ui/utilities/utilities-city-yields.js.map

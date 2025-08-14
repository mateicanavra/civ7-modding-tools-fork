/**
 * @file utility-plotcoord.ts
 * @copyright 2021, Firaxis Games
 */
export var PlotCoord;
(function (PlotCoord) {
    let Range;
    (function (Range) {
        Range[Range["INVALID_X"] = -9999] = "INVALID_X";
        Range[Range["INVALID_Y"] = -9999] = "INVALID_Y";
    })(Range || (Range = {}));
    ;
    function toString(loc) {
        if (loc) {
            let str = loc.x + ";" + loc.y;
            return str;
        }
        else {
            return "";
        }
    }
    PlotCoord.toString = toString;
    function fromString(str) {
        let retVal = null;
        if (str) {
            let strs = str.split(';');
            if (strs.length >= 2) {
                retVal = { x: Range.INVALID_X, y: Range.INVALID_Y };
                retVal.x = parseInt(strs[0]);
                retVal.y = parseInt(strs[1]);
            }
        }
        return retVal;
    }
    PlotCoord.fromString = fromString;
    function isInvalid(loc) {
        if (loc) {
            if (loc.x <= Range.INVALID_X && loc.y <= Range.INVALID_Y) {
                return true;
            }
        }
        return false;
    }
    PlotCoord.isInvalid = isInvalid;
    function isValid(loc) {
        if (loc) {
            if (loc.x > Range.INVALID_X && loc.y > Range.INVALID_Y) {
                return true;
            }
        }
        return false;
    }
    PlotCoord.isValid = isValid;
})(PlotCoord || (PlotCoord = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-plotcoord.js.map

/**
 * @file utility-serialize.ts
 * @copyright 2024, Firaxis Games
 * @description Uses property chunking to persist values into and across saves.
 *		Abuses the Tutorial read/write store.
 *	 	A top level "catalog" object tracks all the objects in the store.
 * 		Each object can have multiple properties read/writen
 * 		Logically this becomes the follow key/value pairs (where key is a hash):
 * 			_MyStuff__KEYS					<objid1>,<objid2>, ... ,<objidN>
 * 			_MyStuff_OBJ_<objid1>_KEYS		<key1>,<key2, ... ,<keyN>
 * 			_MyStuff_OBJ_<objid1>_<key1>	<value1>
 * 			_MyStuff_OBJ_<objid1>_<key2>	<value2>
 * 			:
 * 			_MyStuff_OBJ_<objid1>_<keyN>	<valueN>
 * 			_MyStuff_OBJ_<objid2>_KEYS		<key1>,<key2, ... ,<keyN>
 * 			_MyStuff_OBJ_<objid2>_<key1>	<value1>
 * 			_MyStuff_OBJ_<objid2>_<key2>	<value2>
 * 			:
 * 			_MyStuff_OBJ_<objid2>_<keyN>	<valueN>
 * 			:
 * 			:
 * 			_MyStuff_OBJ_<objidN>_KEYS		<key1>,<key2, ... ,<keyN>
 * 			_MyStuff_OBJ_<objidN>_<key1>	<value1>
 * 			_MyStuff_OBJ_<objidN>_<key2>	<value2>
 * 			:
 * 			_MyStuff_OBJ_<objidN>_<keyN>	<valueN>
 *
 * @usage
 * 			const catalog = new Catalog("MyStuff");
 * 			const obj = catalog.getObject("foo");
 * 			const old = obj.read("oldStuff");
 * 			obj.write("newInfo","I sure hope this works!")
 */
class SerialBase {
    /**
     * CTOR
     * @param id is the identifier of this object in the catalog
     * @param scope the parent scope
     */
    constructor(id, scope) {
        this.childrenIDs = new Set();
        this.id = id;
        this.scope = scope;
        this.hashPreamble = "_" + scope + "_" + id + "_";
        this.readIDs();
    }
    /**
     * Consistent way to make a hash from a value using the preamble
     * @param key Value to hash (along with the preamble.)
     * @returns hash value
     */
    makeHash(key) {
        const hash = Database.makeHash(this.hashPreamble + key);
        return hash;
    }
    /**
     * Read in the list of ids (keys) for the values this scopes.
     * @returns the number of IDs read or -1 if they don't exist
     */
    readIDs() {
        const hash = this.makeHash("KEYS");
        const ids = GameTutorial.getProperty(hash);
        if (ids) {
            if (typeof ids === "string") {
                this.childrenIDs = new Set(ids.split(","));
                return this.childrenIDs.size;
            }
        }
        return -1;
    }
    /**
     * Write out the list of ids (keys) for the values this scopes.
     */
    writeIDs() {
        const hash = this.makeHash("KEYS");
        const ids = Array.from(this.childrenIDs).join(",");
        GameTutorial.setProperty(hash, ids);
    }
    /**
     * Get collection of IDs maintained by this object.
     * @returns a set of IDs
     */
    getKeys() {
        return this.childrenIDs;
    }
    /**
     * Debug Helper
     * @returns a comma separated string of IDs maintained by this object
     */
    getKeysAsString() {
        return [...this.childrenIDs].join(", ");
    }
}
/**
 * An object for reading/writing a group of properties.
 */
export class SerialObject extends SerialBase {
    /**
     * Read a single value
     * @param key of value to read
     * @returns a type supported for serialization
     */
    read(key) {
        const hash = this.makeHash(key);
        const value = GameTutorial.getProperty(hash);
        return value;
    }
    /**
     * Write a single key,value
     * @param key the key to associate with this value
     * @param value to save out
     */
    write(key, value) {
        const hash = this.makeHash(key);
        GameTutorial.setProperty(hash, value);
        if (!this.childrenIDs.has(key)) {
            this.childrenIDs.add(key);
            this.writeIDs();
        }
    }
}
/**
 * Top level class that maintains the catalog of serial objects.
 */
export class Catalog extends SerialBase {
    /**
     * CTOR
     * @description Tracks object with values in array kept in key: _DEFAULT__KEYS
     * @param scope, optional parameter for what named "catalog" objects will be a part of
     */
    constructor(scope = "DEFAULT") {
        super("", scope);
    }
    /**
     * Return an object associated with this catalog; creates one if it doesn't exist.
     * @param id Identifier of the object.
     * @returns {SerialObject}
     */
    getObject(id) {
        if (!this.exists(id)) {
            this.childrenIDs.add(id);
            this.writeIDs();
        }
        return new SerialObject(id, this.scope + "_OBJ");
    }
    /**
     * Does an object exist in this catalog?
     * @param id Identifier of the object.
     * @returns true if object exists.
     */
    exists(id) {
        return this.childrenIDs.has(id);
    }
}

//# sourceMappingURL=file:///core/ui/utilities/utility-serialize.js.map

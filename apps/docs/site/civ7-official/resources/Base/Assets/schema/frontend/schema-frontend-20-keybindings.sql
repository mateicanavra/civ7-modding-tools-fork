-- Input Configuration
-- These tables are used to store available input actions.
CREATE TABLE 'InputVersion'(
	'Value' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY('Value')
);

CREATE TABLE 'InputContexts'(
	'ContextId' TEXT NOT NULL,
	'Value' INTEGER NOT NULL DEFAULT 1, /* Power of 2 for unique bit mask ; Should never be 0, which is reserved for Universal actions (allowed in all contexts) */
	'Name' TEXT NOT NULL,
	PRIMARY KEY('ContextId')
);

CREATE TABLE 'InputActions'(
	'ActionId' TEXT NOT NULL,
	'Name' TEXT,
	'Description' TEXT,
	'DeviceType' TEXT NOT NULL DEFAULT 'Keyboard',
	'EventType' TEXT NOT NULL DEFAULT 'StartFinish',
	'SortIndex' TEXT,
	PRIMARY KEY('ActionId')
);

/* If an action is NOT in this table, it means it is Universal (allowed in all contexts).
 * An action CAN be restricted to more than one context.
 */
CREATE TABLE 'InputContextConstraints'(
	'ActionId' TEXT NOT NULL,
	'ContextId' TEXT NOT NULL,
	PRIMARY KEY('ActionId', 'ContextId'),
	FOREIGN KEY('ActionId') REFERENCES 'InputActions'('ActionId') ON DELETE CASCADE ON UPDATE CASCADE
	FOREIGN KEY('ContextId') REFERENCES 'InputContexts'('ContextId') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE 'InputActionDefaultGestures' (
	'ActionId' TEXT NOT NULL,
	'ContextOverrideId' TEXT, /* NULL means "by default" */
	'Index' INTEGER NOT NULL, /* To make the distinction between overriding the first gesture or adding another one */
	'GestureType' TEXT NOT NULL,
	'GestureData' TEXT NOT NULL,	
	PRIMARY KEY('ActionId', 'ContextOverrideId', 'Index'),
	FOREIGN KEY('ActionId') REFERENCES 'InputActions'('ActionId') ON DELETE CASCADE ON UPDATE CASCADE
	FOREIGN KEY('ContextOverrideId') REFERENCES 'InputContexts'('ContextId') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE 'InputKeyData' (
	'KeyId' TEXT NOT NULL,
	'KeyString' TEXT NOT NULL,
	'KeyIcon' TEXT NOT NULL,
	'KeyType' TEXT NOT NULL,
	PRIMARY KEY('KeyId')
);

CREATE TABLE IProperties('Collection' TEXT NOT NULL,
						'Name' TEXT NOT NULL,
						'Type' TEXT NOT NULL,
						'Container' TEXT,
						'Access' TEXT,
						'Definition' TEXT,
						'InitializeBy' TEXT,
						'Value' TEXT,
PRIMARY KEY("Collection", "Name")
);
						
CREATE TABLE IPropertyTypes('Type' TEXT NOT NULL UNIQUE,
						'KindOf' TEXT,
						'Definition' TEXT,
PRIMARY KEY("Type")
);
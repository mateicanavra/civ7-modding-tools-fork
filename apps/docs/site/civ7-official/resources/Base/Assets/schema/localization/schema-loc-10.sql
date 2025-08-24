		
CREATE TABLE Languages(	'Locale' TEXT NOT NULL UNIQUE,
						'Name' TEXT NOT NULL,
                        'Collator' TEXT,
						'PluralRule' INTEGER DEFAULT 1);
						
CREATE TABLE AudioLanguages('AudioLanguage' TEXT NOT NULL,
							'Name' TEXT NOT NULL,
							PRIMARY KEY (AudioLanguage));
						
CREATE TABLE DefaultAudioLanguages(	'Locale' TEXT NOT NULL,
									'AudioLanguage' TEXT NOT NULL,
									PRIMARY KEY (Locale));
															
CREATE TABLE LanguagePriorities('PrimaryLanguage' TEXT NOT NULL,
								'Language' TEXT NOT NULL,
								'Priority' INT NOT NULL,
								PRIMARY KEY(PrimaryLanguage, Language),
								FOREIGN KEY (PrimaryLanguage) REFERENCES Languages(Locale),
								FOREIGN KEY (Language) REFERENCES Languages(Locale));
						
					
CREATE TABLE LocalizedText(	'Language' TEXT NOT NULL,
							'Tag' TEXT NOT NULL,
							'Text' TEXT,						
							'Gender' TEXT,
							'Plurality' TEXT,
                            PRIMARY KEY (Language, Tag));
							
-- These views and triggers are temporary and are used to simplify the XML files used to populate the database.
-- They are dropped in post processing.
CREATE VIEW EnglishText AS
	SELECT Tag, Text, Gender, Plurality FROM LocalizedText WHERE Language = 'en_US';
	
CREATE TRIGGER AddEnglishText INSTEAD OF INSERT ON EnglishText
BEGIN
	INSERT INTO LocalizedText ('Language', 'Tag', 'Text', 'Gender', 'Plurality') VALUES('en_US', NEW.Tag, NEW.Text, NEW.Gender, NEW.Plurality);
END;					   

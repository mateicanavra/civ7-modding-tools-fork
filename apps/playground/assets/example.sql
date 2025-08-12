SELECT Tag, Language, REPLACE(Text, "+30%[icon:YIELD_PRODUCTION]", "+30% [icon:YIELD_PRODUCTION]")
FROM LocalizedText WHERE Tag LIKE "LOC_TRAIT_%";

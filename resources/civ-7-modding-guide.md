Got it. I’ll put together a detailed Civilization VII modding guide focused on creating new civilizations with leaders, modifying gameplay elements, UI, and maps/scenarios—using the most up-to-date community knowledge, especially from CivFanatics and CivWiki. I’ll avoid all Civilization VI references and focus purely on CIV 7’s ecosystem and file structure.

I’ll let you know once the guide is ready for your review.

# **Civilization VII Modding Guide**  

**Introduction:**  
Modding *Sid Meier’s Civilization VII* is now possible even before official tools are released, thanks to the game’s open XML/SQL/JSON data structure and community discoveries. Civ VII organizes game content into “modules” (the base game and each Age are modules), and mods are treated as additional modules ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Civ%207%20uses%20the%20module,modinfo%20definition%20file)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CActionGroups%3E%20%3CActionGroup%20id%3D%22solver,text%22%20scope%3D%22game%22%20criteria%3D%22antiquity)). There is no ModBuddy or in-game WorldBuilder yet, so creating mods requires manual setup: writing XML/SQL for game data changes, JavaScript (JS) for UI scripts (Civ VII uses JS instead of Lua for UI logic ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=Oh%20darn,goes%202%20years%20of%20preparation))), and packaging these files in a proper folder with a **.modinfo** definition. This guide will walk you through: 

- Setting up the **mod folder and .modinfo** file (folder structure, naming conventions, required tags).  
- **Creating new civilizations and leaders** (with two leaders for one civ as an example).  
- **Modifying gameplay elements** (rules, abilities, units, techs, etc.) using XML/SQL and hooking into game mechanics.  
- **UI enhancements** (finding and editing the UI files, testing changes).  
- **Maps and scenario creation** (custom map scripts, larger map sizes, scenario tips).  
- **Best practices** for organizing, packaging, and testing Civ7 mods.

By following this structured guide – and using community templates and references – you can start building Civ7 mods even before official tools arrive. *(Note: This guide focuses on Civ VII specifics; avoid assuming Civ VI file names or paths, as Civ VII’s setup differs.)*  

## **1. Mod Folder Setup and .modinfo Structure**  
Before writing mod code, set up the proper folder and **.modinfo** file so Civ7 can recognize your mod:

- **Mods Folder Location:** Create a folder for your mod under the Civ7 user mods directory. By default, mods are located in:  
  `**{User}\AppData\Local\Firaxis Games\Sid Meier's Civilization VII\Mods**` (on Windows) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Disclaimer%3A%20I%20am%20using%20the,AppData%5CLocal%5CFiraxis%20Games%5CSid%20Meier%27s%20Civilization%20VII)) ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Civilization%207%20isn%E2%80%99t%20available%20to,should%20show%20up%20as%20enabled)). If this “Mods” folder doesn’t exist yet, create it. Place your mod’s folder here and Civ7 will auto-detect it by updating its Mods.sqlite database (this happens automatically when a valid mod folder is present) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=To%20install%20the%20mod%2C%20it,detects%20a%20new%20valid%20mod)). After adding your mod, launch the game and check **Additional Content** in the menu to see if it appears and is enabled ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Civilization%207%20isn%E2%80%99t%20available%20to,should%20show%20up%20as%20enabled)). *(See image below: the “Additional Content” screen with a UI mod enabled.)*  

 ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact)) *Civ7 Additional Content menu showing a user mod enabled (e.g. “Sukritact’s Simple UI Adjustments”). Mods appear in this list when the .modinfo is set up correctly ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Civilization%207%20isn%E2%80%99t%20available%20to,should%20show%20up%20as%20enabled)).*  

- **Mod Folder Name:** Name your mod folder uniquely and avoid spaces/special characters for simplicity. A common convention is to include your name/initials and mod purpose (e.g. `YourName_NewCivMod`). Inside this folder will be your .modinfo and subfolders for mod files.  

- **.modinfo File:** This XML file is the heart of your mod. It defines the mod’s identity, dependencies, and what files to load. Create a file named after your mod (e.g. **YourModName.modinfo**) in the mod folder. A basic template looks like:  

  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <Mod id="yourname-newcivmod" version="1" xmlns="ModInfo">
      <Properties>
          <Name>LOC_MOD_YOURNAME_NEWCIV_NAME</Name>
          <Description>New Civilization Mod by YourName.</Description>
          <Authors>YourName</Authors>
          <ShowInBrowser>1</ShowInBrowser>
          <Package>YourNameMods</Package>
      </Properties>
      <Dependencies>
          <!-- Depend on base game content (e.g. Antiquity age) if needed -->
          <Mod id="age-antiquity" title="LOC_MODULE_AGE_ANTIQUITY_NAME"/>
      </Dependencies>
      <ActionCriteria>
          <!-- Define criteria for conditional actions (if needed) -->
          <Criteria id="Always">
              <AlwaysMet/>
          </Criteria>
      </ActionCriteria>
      <ActionGroups>
          <!-- Load gameplay data (XML/SQL) -->
          <ActionGroup id="NewCiv_Data" scope="Game" criteria="Always">
              <Actions>
                  <UpdateDatabase>
                      <Item>Data/NewCivData.xml</Item>
                  </UpdateDatabase>
              </Actions>
          </ActionGroup>
          <!-- Load text (localization) -->
          <ActionGroup id="NewCiv_Text" scope="Game" criteria="Always">
              <Actions>
                  <UpdateText>
                      <Item>Text/NewCivText.xml</Item>
                  </UpdateText>
              </Actions>
          </ActionGroup>
      </ActionGroups>
      <LocalizedText>
          <File>Text/en_us/NewCivText.xml</File>
          <!-- Additional localization files can be listed here -->
      </LocalizedText>
  </Mod>
  ```  

  Let’s break down the important pieces:  

  - **`Mod id` and Identity:** The `<Mod id="...">` attribute is a unique identifier for your mod ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Note%20that%20the%20mod%20id,important%20and%20should%20be%20unique)). **Choose a unique ID** that no other mod is likely to use (for example, include your name or a GUID). The community strongly advises uniqueness – e.g. `id="yourname-newcivmod"` – to prevent conflicts ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=%3CMod%20id%3D%22yourname)). Use only letters, numbers, hyphens or underscores. Once chosen, **use this ID consistently** in certain file references (as we’ll see with map scripts).  
    - The `version="1"` can be incremented for new releases (not critical for functionality now, but good practice).  
    - `xmlns="ModInfo"` should remain as shown (required namespace).  

  - **Properties:** Inside `<Properties>` define basic info:  
    - `<Name>` and `<Description>` can use literal text or (as shown above) a localization key. In the example, `LOC_MOD_YOURNAME_NEWCIV_NAME` would be defined in your text file to display a proper name in the mods menu. Using LOC keys is good for multi-language support.  
    - `<Authors>` is your name or handle.  
    - `<ShowInBrowser>` set to `1` ensures the mod is visible in the in-game mods browser (Additional Content menu) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=,antiquity%22%20title%3D%22LOC_MODULE_AGE_ANTIQUITY_NAME)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CActionGroups%3E%20%3CActionGroup%20id%3D%22solver,text%22%20scope%3D%22game%22%20criteria%3D%22antiquity)).  
    - `<Package>` can be a grouping label (not critical, but we used “YourNameMods” as an example grouping).  

  - **Dependencies:** Use this section if your mod *requires* certain official content to be present. For example, if your mod touches Antiquity Age data (the default starting era content), you might list a dependency on the “age-antiquity” module ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3C%2FProperties%3E%20%3CDependencies%3E%20%3CMod%20id%3D%22age,current)). In the template above, we included:  
    ```xml
    <Mod id="age-antiquity" title="LOC_MODULE_AGE_ANTIQUITY_NAME"/>
    ```  
    This ensures the Antiquity module is loaded (which it always is in a standard game) and avoids loading your changes in contexts where that content isn’t present. In general, **depend on the game’s base modules that contain the content you mod**. Civ7’s base game is split into modules by era: for instance, core and standard rules, plus modules for Ages “antiquity”, “exploration”, and “modern” ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=loaded%20independently%20from%20each%20other%2C,each%20has%20a%20modinfo%20file)) ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=,Click%20to%20expand)). A new civilization available from the start should depend on at least the antiquity age module (since that’s when it enters the game). If your mod adds content for later eras, you might list those as well. *Example:* A civ that only becomes available in the Modern Age could depend on `age-modern`. (If in doubt, you can often just depend on antiquity or leave dependencies empty for general mods – Civ7 will load core and age modules as needed by game setup. But specifying ensures no missing references.)  

  - **ActionCriteria (optional):** This defines any conditional criteria for actions. In many mods you’ll simply use an “Always” criteria (always apply changes). The example defines `<Criteria id="Always"><AlwaysMet/></Criteria>` meaning this criteria is always true ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CActionCriteria%3E%20%3CCriteria%20id%3D,current%22%3E%20%3CAgeInUse%3EAGE_ANTIQUITY%3C%2FAgeInUse%3E%20%3C%2FCriteria%3E%20%3C%2FActionCriteria)). You can also define criteria tied to game state, like checking if a specific Age is active. In the sample from Firaxis, they used a criteria `"antiquity-age-current"` to detect if the game is in Antiquity ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CAlwaysMet%2F%3E%20%3C%2FCriteria%3E%20%3CCriteria%20id%3D%22antiquity,actions%22%20scope%3D%22game%22%20criteria%3D%22always%22%3E%20%3CActions)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3C%2FActionGroup%3E%20%3CActionGroup%20id%3D%22solver,ActionGroup)). You would then attach certain actions only under that condition. For most simple mods, you won’t need complex criteria – but it’s powerful for mods that should only apply in certain scenarios or eras.  

  - **ActionGroups:** This is where you specify what your mod actually *does*. Each `<ActionGroup>` has an `id` (unique within your mod), a `scope`, and links to a `criteria`. Common scopes are:  
    - **`scope="Game"`** for gameplay changes (XML/SQL that modify the game database or add content). This is used for anything that affects the actual game (civs, units, rules, etc.).  
    - **`scope="UI"` or others** might be used for interface scripts or front-end menus. (Civ7’s exact scopes for UI haven’t been officially documented, but UI mods so far seem to work under the Game scope as well, since they alter in-game UI. Front-end menu mods might use a different scope if needed. In Civ6, we had FrontEnd vs InGame contexts, but in Civ7, it’s likely similar or managed via criteria. If doing UI-only changes, you can still use the default scope and just include the UI files as actions – more on this in the UI section.)  

    Inside each ActionGroup, list one or more Actions. Typical action types:  
    - **`<UpdateDatabase>`**: to execute an XML/SQL file that modifies the game’s database (units, civilizations, techs, etc.).  
    - **`<UpdateText>`**: to load localization text (usually XML of text keys).  
    - **`<AddGameplayScripts>`** or **`<AddUserInterfaces>`**: these were used in Civ6 for adding custom Lua scripts or UI, and Civ7 likely has analogous action tags. So far, modders have been using `<UpdateDatabase>` for gameplay and sometimes placing UI scripts in the mod for the game to pick up. We’ll address UI specifically later – but know that UI files might be added via a similar mechanism in the .modinfo.  

    In the template, we have two ActionGroups: one for gameplay data (`NewCiv_Data`) and one for text (`NewCiv_Text`), both using the “Always” criteria so they run for any game using the mod. The `<Item>` path should point to the relative location of your mod’s files. In our example, we’ll store game data in a **Data** subfolder and text in **Text** subfolder. (You can organize as you like, just match the paths here.)  

    *Example from the official “SolverExampleMod”:* It updated a unit only during Antiquity, so the modinfo had one ActionGroup with `criteria="always"` to update the unit’s stats database, and another with `criteria="antiquity-age-current"` to update text, ensuring the text change (unit name) only loads in Antiquity ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CActionGroups%3E%20%3CActionGroup%20id%3D%22solver,text%22%20scope%3D%22game%22%20criteria%3D%22antiquity)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3CActionGroup%20id%3D%22solver,ActionGroup)). Conditional loading prevented errors when that unit doesn’t exist in later eras ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=The%20mod%20is%20going%20to,and%20always%20to%20run%20always)). In your mods, you can usually use “Always” for content that should always be loaded (like new civ definitions), but if you were, say, modifying something specific to the Exploration age, you might wrap that in an appropriate criteria.  

  - **LocalizedText:** This section lists text files that contain your mod’s localization strings. It’s separate from ActionGroups because text can be handled a bit differently (Civ7 may merge text across languages automatically). In the template we point to `Text/en_us/NewCivText.xml` for English. If you plan multi-language support, you can include other language files (e.g. `Text/fr_fr/...`) or use a single “l10n” file with multiple translations. In the Firaxis example, they included an `l10n/SolverText.xml` as well, likely containing a secondary language (German) text ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=,Mod)). For simplicity, start with English; you can add translations later. Just ensure every `<File>` here exists in your mod folder.  

**Summary of Structure:** Your mod folder might look like this after setup:  

```
Mods\
  YourName_NewCivMod\ 
    YourName_NewCivMod.modinfo  
    Data\  
      NewCivData.xml  
      (other gameplay XML/SQL files)  
    Text\  
      en_us\  
         NewCivText.xml  
      (possibly other languages or a combined localization file)  
    (Optional subfolders like UI\ or Maps\ if your mod adds UI scripts or maps)
```  

With the .modinfo configured and files in place, launch Civ7. The game should detect the mod. You can verify in **Additional Content** menu that your mod is listed (the `ShowInBrowser` property ensures it’s visible) and **ENABLED**. If it’s not showing up, double-check that the .modinfo XML is well-formed (no typos) and that the mod folder is in the correct directory. Once it appears, any new game you start with mods enabled will load your changes. 

## **2. Creating New Civilizations and Leaders**  
One of the most exciting modding projects is adding a brand new Civilization with custom Leaders. Civ VII is designed to have many civs introduced across eras, and the developers even mentioned they expect the community to add civs and leaders to fill historical gaps ([Will Civ VII be more modable than VI? - Reddit](https://www.reddit.com/r/civ/comments/1gxxvm6/will_civ_vii_be_more_modable_than_vi/#:~:text=Will%20Civ%20VII%20be%20more,in%20the%20blanks%20during)). In our example, we’ll create a new civilization with **two leaders**. This could represent, for instance, a civilization that has an ancient-era leader and a modern-era leader, or simply two alternative leaders for more variety. 

**2.1 Defining the Civilization:**  
Civilizations in Civ7 are defined in the game database, likely similar to Civ6 but split by era modules. In the base game files, *civilization definitions for Antiquity era civs are in* `...\Base\Modules\age-antiquity\data\civilizations.xml` ([List of Starting Biases in Civ 7 : r/civ](https://www.reddit.com/r/civ/comments/1ip5edt/list_of_starting_biases_in_civ_7/#:~:text=VII%2FBase%2Fmodules%2Fbase)), while leaders are defined in the base-standard module’s data (the *leaders.xml* in base-standard) ([List of Starting Biases in Civ 7 : r/civ](https://www.reddit.com/r/civ/comments/1ip5edt/list_of_starting_biases_in_civ_7/#:~:text=VII%2FBase%2Fmodules%2Fbase)). We don’t edit those files directly; instead, we create our own XML to *add* a new civ. 

In your mod’s Data file (let’s say **NewCivData.xml**), you will add entries to several tables: **Civilizations**, **Leaders**, and a linking table between them (since Civ7, like Civ6, allows multiple leaders per civ via a mapping table). You’ll also define any unique abilities or units for the civ/leader (covered in 2.3). 

A basic template for adding a civilization with two leaders might look like this: 

```xml
<!-- NewCivData.xml -->
<?xml version="1.0" encoding="utf-8"?>
<Database>
    <!-- Add a new Civilization -->
    <Civilizations>
        <Row CivilizationType="CIVILIZATION_MY_NEW_CIV" 
             Name="LOC_CIV_MY_NEW_CIV_NAME" 
             Description="LOC_CIV_MY_NEW_CIV_DESCRIPTION" 
             Icon="ICON_CIV_MY_NEW_CIV" 
             OriginEra="ERA_ANTIQUITY" />
             <!-- 
             - CivilizationType is the unique internal name.
             - Name/Description are text keys for display.
             - Icon is the key for the civilization icon (if adding a custom icon).
             - OriginEra (if present in Civ7 schema) might specify the era this civ is first available. 
               (In Civ7, civs have an “origin” age; here we assume Antiquity start.)
             -->
    </Civilizations>

    <!-- Add new Leaders -->
    <Leaders>
        <Row LeaderType="LEADER_MY_NEWLEADER_1" 
             Name="LOC_LEADER_MY_NEWLEADER_1_NAME" 
             AbilityName="LOC_LEADER_MY_NEWLEADER_1_ABILITY_NAME" 
             AbilityDescription="LOC_LEADER_MY_NEWLEADER_1_ABILITY_DESCRIPTION" 
             Icon="ICON_LEADER_MY_NEWLEADER_1" />
        <Row LeaderType="LEADER_MY_NEWLEADER_2" 
             Name="LOC_LEADER_MY_NEWLEADER_2_NAME" 
             AbilityName="LOC_LEADER_MY_NEWLEADER_2_ABILITY_NAME" 
             AbilityDescription="LOC_LEADER_MY_NEWLEADER_2_ABILITY_DESCRIPTION" 
             Icon="ICON_LEADER_MY_NEWLEADER_2" />
    </Leaders>

    <!-- Map Leaders to the Civilization -->
    <CivilizationLeaders>
        <Row CivilizationType="CIVILIZATION_MY_NEW_CIV" LeaderType="LEADER_MY_NEWLEADER_1" />
        <Row CivilizationType="CIVILIZATION_MY_NEW_CIV" LeaderType="LEADER_MY_NEWLEADER_2" />
    </CivilizationLeaders>

    <!-- Define unique abilities/traits for the Civ and Leaders (if any) -->
    <!-- For example, give the Civ a unique trait and each leader a trait. -->
    <Traits>
        <Row TraitType="TRAIT_CIV_MY_NEW_CIV_UNIQUE" Name="LOC_TRAIT_MY_NEW_CIV_NAME" Description="LOC_TRAIT_MY_NEW_CIV_DESCRIPTION"/>
        <Row TraitType="TRAIT_LEADER_NEWLEADER1_UNIQUE" Name="LOC_TRAIT_NEWLEADER1_NAME" Description="LOC_TRAIT_NEWLEADER1_DESCRIPTION"/>
        <Row TraitType="TRAIT_LEADER_NEWLEADER2_UNIQUE" Name="LOC_TRAIT_NEWLEADER2_NAME" Description="LOC_TRAIT_NEWLEADER2_DESCRIPTION"/>
    </Traits>
    <CivilizationTraits>
        <Row CivilizationType="CIVILIZATION_MY_NEW_CIV" TraitType="TRAIT_CIV_MY_NEW_CIV_UNIQUE"/>
    </CivilizationTraits>
    <LeaderTraits>
        <Row LeaderType="LEADER_MY_NEWLEADER_1" TraitType="TRAIT_LEADER_NEWLEADER1_UNIQUE"/>
        <Row LeaderType="LEADER_MY_NEWLEADER_2" TraitType="TRAIT_LEADER_NEWLEADER2_UNIQUE"/>
    </LeaderTraits>

    <!-- (Optional) Unique Units, Buildings, etc., would be added here -->
</Database>
```

Let’s unpack this step by step:

- **Civilizations Table:** We insert a new row for our civ. The `CivilizationType` is a unique ID (usually prefix with “CIVILIZATION_”). By convention, use all caps with underscores. We set the Name and Description to LOC keys (to be defined in the text file). You might also specify an `Icon` (which corresponds to an icon sheet entry – we’ll cover art later) so the game knows what symbol to show for your civ. If Civ7’s schema includes an origin era or grouping (we included a guess: OriginEra), set it appropriately (many base civs likely have OriginEra = ERA_ANTIQUITY if they start in the first age). This helps the game know when the civ becomes available.  

- **Leaders Table:** Add a row for each new leader. Each leader gets a `LeaderType` (e.g. "LEADER_MY_NEWLEADER_1"). Provide a Name (text key) and optionally ability name/description keys if the leader has a special ability. The `AbilityName` and `AbilityDescription` fields are typically used to show the leader’s unique ability in the UI (Civilopedia, tooltips). If your leader has no unique ability, you could leave those blank or still define a trait with a placeholder “ability” just for completeness. Also assign an `Icon` for the leader portrait if adding custom art.  

- **CivilizationLeaders Table:** This links each leader to a civ. For each leader row, insert a mapping: `CivilizationType` = your civ, `LeaderType` = that leader. This is essential; without it, the game won’t know that those leaders belong to the new civilization. In our example, we add two mappings for the two leaders. (If you forget this, your leaders won’t appear in the civ selection, or the civ might show up with no leaders.)  

- **Traits (Civilization and Leader Abilities):** Civ VII likely uses a trait-modifier system akin to Civ VI for unique abilities. We created entries in a **Traits** table for one civ trait and two leader traits. The trait’s Name/Description are text keys for display. You then assign the trait to the civ in **CivilizationTraits**, and assign each leader’s trait in **LeaderTraits**. This wiring means “this civ has X ability” and “this leader has Y ability.” You can skip this if you’re not giving any special abilities, but typically every civ and leader has at least one unique. After defining these traits, you will need to implement their effects (via Modifiers, which we’ll discuss in *Modifying gameplay elements*, Section 3).  

- **Unique Units or Buildings:** If your civ has a unique unit, improvement, district, etc., you would also add those to the relevant tables (Units, Buildings, etc.) and then tie them to the civ. For example, Civ6 had tables like `Units` and a `CivilizationUnits` junction to assign a unique unit to a civ. Civ7 likely has something similar or simply an attribute on the unit. You can define a new unit entry in XML similarly to base game units and set it as unique to your civ (perhaps via a `PrereqCivilization` column in Units, or a separate mapping table). Because that goes into gameplay data, you’d do it in the same XML file. We’ll cover a bit of unit adding in Section 3 as well.  

After writing these entries, our **NewCivData.xml** is ready. It will add a new civ and two leaders into the game’s database when the mod loads. But to see proper names and descriptions in-game, we need to provide the text for all those LOC_ keys we used.

**2.2 Localization (Text) for the New Civ and Leaders:**  
Create a **NewCivText.xml** in your Text folder (we referenced it in the .modinfo). A simple text file might look like: 

```xml
<?xml version="1.0" encoding="utf-8"?>
<LocalizedText>
  <!-- Civilization name and description -->
  <Text Tag="LOC_CIV_MY_NEW_CIV_NAME" Language="en_US">[Your Civ Name]</Text>
  <Text Tag="LOC_CIV_MY_NEW_CIV_DESCRIPTION" Language="en_US">[Brief description for Civilopedia or selection screen]</Text>

  <!-- Leader 1 name and ability text -->
  <Text Tag="LOC_LEADER_MY_NEWLEADER_1_NAME" Language="en_US">[Leader One Name]</Text>
  <Text Tag="LOC_LEADER_MY_NEWLEADER_1_ABILITY_NAME" Language="en_US">[Leader One Ability Name]</Text>
  <Text Tag="LOC_LEADER_MY_NEWLEADER_1_ABILITY_DESCRIPTION" Language="en_US">[Description of Leader One’s ability]</Text>

  <!-- Leader 2 name and ability text -->
  <Text Tag="LOC_LEADER_MY_NEWLEADER_2_NAME" Language="en_US">[Leader Two Name]</Text>
  <Text Tag="LOC_LEADER_MY_NEWLEADER_2_ABILITY_NAME" Language="en_US">[Leader Two Ability Name]</Text>
  <Text Tag="LOC_LEADER_MY_NEWLEADER_2_ABILITY_DESCRIPTION" Language="en_US">[Description of Leader Two’s ability]</Text>

  <!-- Trait text -->
  <Text Tag="LOC_TRAIT_MY_NEW_CIV_NAME" Language="en_US">[Name of Civ’s Unique Ability]</Text>
  <Text Tag="LOC_TRAIT_MY_NEW_CIV_DESCRIPTION" Language="en_US">[Description of Civ’s Unique Ability effects]</Text>
  <Text Tag="LOC_TRAIT_NEWLEADER1_NAME" Language="en_US">[Name of Leader1’s Unique Ability]</Text>
  <Text Tag="LOC_TRAIT_NEWLEADER1_DESCRIPTION" Language="en_US">[Details of Leader1’s Unique Ability]</Text>
  <Text Tag="LOC_TRAIT_NEWLEADER2_NAME" Language="en_US">[Name of Leader2’s Unique Ability]</Text>
  <Text Tag="LOC_TRAIT_NEWLEADER2_DESCRIPTION" Language="en_US">[Details of Leader2’s Unique Ability]</Text>

  <!-- (Any other text, e.g. unique unit names, building names, etc.) -->
</LocalizedText>
```

Replace the placeholders in brackets with your actual names and descriptions. Keep them concise for UI. With this, your civ and leaders will show up in-game with proper names (instead of placeholder strings). If you play in another language, you’d need to supply those translations or they’ll default to English/keys. Optionally, you can include a generic `l10n` file for all languages to show English text until proper translations are added (as the example mod did, showing a different name if game is set to German by including a German translation ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Image%3A%201738850260228)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=different%20name%20if%20your%20game,is%20set%20to%20German))).

**2.3 Unique Abilities and Balance:**  
Defining the civ and leaders is half the job – you also want to give them interesting abilities, unique units, etc. We set up trait entries and text above. To make them functional: 

- **Leader/Civ Abilities via Modifiers:** In Civ6 (and likely Civ7), traits don’t do anything by themselves until you attach modifiers. A Modifier links a trait to a game effect (like “+5 combat strength for units” or “bonus resource yield”). This is done in XML by creating a row in the **Modifiers** table and linking it to your Trait in **TraitModifiers**. The specifics are complex, but essentially: pick an existing effect in the game’s libraries (like `EFFECT_GRANT_UNIT_COMBAT_STRENGTH` or similar) or create a new one, and target it via requirements. Since this guide focuses on structure, we won’t detail every possible modifier. A straightforward way is to find a similar ability in base game XML and mirror its modifier setup. For instance, if you want your civ’s trait to give extra science from campuses, find a civ in base game with a similar bonus and copy how it’s implemented. The community will surely document Civ7’s Modifier types as time goes on. For now, know that to implement an ability you will likely add something like:  

  ```xml
  <Modifiers>
    <Row ModifierType="MODIFIER_CIV_MY_NEW_CIV_SCIENCE_BONUS" 
         EffectType="EFFECT_ADJUST_YIELD_OF_BUILDINGS" 
         ... [other fields like Collection, Operation, etc.] />
  </Modifiers>
  <ModifierArguments>
    ... (arguments specifying which yield, which buildings, how much, etc.)
  </ModifierArguments>
  <TraitModifiers>
    <Row TraitType="TRAIT_CIV_MY_NEW_CIV_UNIQUE" ModifierId="MODIFIER_CIV_MY_NEW_CIV_SCIENCE_BONUS"/>
  </TraitModifiers>
  ```
  This would attach a yield bonus effect to your civ’s trait. Refer to community forums for specific syntax – as of now, modders are still discovering Civ7’s exact modifier keywords, but many are similar to Civ6.  

- **Unique Unit or Building:** If your civ has a unique unit (say a special swordsman), add a new <Units> entry. You can copy an existing unit’s attributes and tweak strength, cost, etc., and give it a new UnitType (e.g., “UNIT_MY_CIV_UNIQUE_UNIT”). Then link it to the civ so that only that civ can build it. Civ7 might automatically handle unique units by a `PrereqCivilization` field in the Units table (Civ6 did that). If not, there could be a `CivilizationUnits` table; either way, include that link. Similarly for buildings or districts. Place any new unit/building art (models, icons) in your mod if you have them – though creating new 3D models is beyond current capabilities with no toolkit. You can reuse existing art references for now.  

Once you have game data and text ready, **boot up Civ7 and test your new civilization**. You should see it as a selectable civ on the new game setup screen (likely listed under the Antiquity era civs by default, or possibly in all eras if unlocked). If you set up two leaders, you might see your civ listed twice (once for each leader persona) or have a way to choose leader – depending on how Civ7’s UI presents multiple leaders for one civ (it might show the civ once and let you select between leaders). Ensure both leaders appear. Start a game and verify: the names, icons, and any unique unit or ability are working. If something is wrong (e.g. you see “LOC_LEADER_...” instead of a name, or the game fails to load), revisit your XML for typos. The **Database.log** and **Modding.log** (found in *Documents/My Games/Sid Meier’s Civilization VII/Logs/*) will list errors if an XML failed to parse or a reference is incorrect. For instance, if you misspell a table name, the log will show an error and that part of your mod won’t load. Debugging mod XML involves reading those logs and fixing issues.  

**Tip:** Keep an eye on era-specific requirements. If your civ is meant to be available from Antiquity onward (most are), you’re fine. If you wanted a leader or civ to only appear in Modern age, there might be extra steps (like tagging them for that era, or simply not using them until then). The mod “Unlock All Civs” bypassed the game’s restriction that some civs/leaders are locked behind reaching later ages ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Even%20though%20the%20game%20has,certain%20prerequisites%20during%20certain%20ages)). By default, Civ7 might require that you’ve progressed to a certain era to play or switch to certain civs. As a modder, you can decide to allow your civ in all ages or only in its historical era. This isn’t fully documented yet, but know that the game’s design supports era-locking civs. Our example mod is an Antiquity-start civ (most straightforward case).  

That covers adding a new civilization! You have: a civ entry, leaders, text, and (optionally) abilities and uniques. Next, we’ll cover general gameplay modifications, which includes adding or tweaking units, rules, and other mechanics – many principles of which we just applied in creating a new civ.

## **3. Modifying Gameplay Elements (Rules, Units, Techs, etc.)**  
Civ VII is highly data-driven, meaning a lot of game rules and content (units, tech costs, building effects, etc.) are defined in XML/SQL tables that mods can alter. In absence of a WorldBuilder or SDK, the community has been directly editing these definitions via mods. Here we cover how to change existing gameplay elements and hook into mechanics:

**3.1 Updating Existing Data (XML/SQL Updates):**  
To modify an existing unit, building, tech, or rule, you typically use an **UPDATE** in SQL or the equivalent `<Update>` syntax in XML. The “Example Gameplay Mod” provided by Firaxis is a perfect illustration: it **renamed the Egyptian Medjay unit to "Uber-Medjay" and set its combat strength to 100** using a simple XML update ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=I%27m%20happy%20to%20post%20an,and%20gives%20them%20100%20strength)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=The%20strength%20update%20for%20the,Medjay%20is%20simple)). Here’s a simplified version of that approach:

- In your mod’s XML, within a `<Database>` context, target the appropriate table and row, then set the new value. For example, to change a unit’s strength:  

  ```xml
  <Unit_Stats>
      <Update>
          <Where UnitType="UNIT_MEDJAY"/>
          <Set Combat="100"/>
      </Update>
  </Unit_Stats>
  ```  

  This finds the row where `UnitType` is `UNIT_MEDJAY` and sets its `Combat` value to 100 ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Code%3A)). This is exactly what the example mod did (which is equivalent to an SQL query: `UPDATE Unit_Stats SET Combat=100 WHERE UnitType='UNIT_MEDJAY';` ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=))). You can similarly update other columns like `Movement`, `Cost`, etc., by adding additional `<Set ...>` lines. Always use the correct table name and column names as defined in Civ7’s schema. Many table and column names are similar to Civ6, but Civ7 introduced new ones for its new features and may split data by era modules. If unsure, search the game’s XML files for the value you want to change to find the right table.  

- To change text (like renaming a unit or technology), it may use a different approach. In the example, the mod *replaced* the text key for the Medjay’s name:  

  ```xml
  <EnglishText>
      <Replace Tag="LOC_UNIT_MEDJAY_NAME">
          <Text>Uber-Medjay</Text>
      </Replace>
  </EnglishText>
  ```  

  This effectively changes the string for that unit’s name to “Uber-Medjay” ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf,Medjay%3C%2FText%3E%20%3C%2FReplace%3E%20%3C%2FEnglishText%3E%20%3C%2FDatabase)). In Civ7, text keys can be updated via the `<Replace>` tag inside the language section. You could also use `<Update>` on text if you prefer, but replace is convenient for swapping out one entire text entry. Note that text changes may need to be loaded under the right criteria (the example only replaced the name during Antiquity so it wouldn’t error out in other ages where the unit didn’t exist ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=The%20mod%20is%20going%20to,and%20always%20to%20run%20always)), but in practice a text key can usually be updated anytime).  

- You can update virtually any game data with this pattern. Some useful examples:  
  - **Adjust technology costs or requirements:** e.g., lower the cost of a tech by updating its cost column in the Technologies table, or change prerequisites by updating a TechPrereqs table.  
  - **Change building yields:** find the Buildings table or a Building_YieldModifiers table and update the yield amount for a specific building.  
  - **Alter policy effects or civic bonuses:** these might be defined in modifiers tables – you could adjust numbers by updating modifier arguments.  
  - **Global parameters/rules:** Civ7 has many game rules defined as “GlobalParameters” or similar game effect tables. For instance, the Settlement (city) limit per civ is governed by a parameter `SETTLEMENT_CAP`. A community member discovered you can change this both per age and globally ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=There%20are%20two%20ways%20to,has%20on%20happiness%2C%20if%20any)) ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=For%20the%20base%20go%20to,standard%2Fdata)). To raise the city cap, you’d edit the `civilizations-gameeffects.xml` via mod: search for `SETTLEMENT_CAP` in each age’s context and increase its Amount. In a mod XML, that might look like:  

    ```xml
    <GlobalParameters>
      <Update>
          <Where Name="SETTLEMENT_CAP" />
          <Set Value="12"/>  <!-- default was maybe 8, now increased to 12 -->
      </Update>
    </GlobalParameters>
    ```  

    Additionally, as noted on CivFanatics, each Age module also defined how overpopulation affects happiness relating to this cap ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=Edit%20the%20file%20civilizations,and%20change%20the%20value%20below)). You could similarly update those values (e.g., reduce the penalty for exceeding the cap by tweaking `MaxReduction` or similar fields). The key is to find the relevant table. The community tip for Settlement Cap was: *“For each age go to ...age-*/data/civilizations-gameeffects.xml, search 'SETTLEMENT_CAP' and change the value. Also edit base-standard’s civilizations-gameeffects.xml for the base value.”* ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=For%20each%20age%20go%20to,own%20folder%3B%20antiquity%2C%20exploration%2C%20modern)) ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=For%20the%20base%20go%20to,standard%2Fdata)) – doing this via a mod means your mod should include those changes (not by directly editing game files, which isn’t ideal for sharing). So you’d incorporate those updates in your mod’s XML.  

  - **Example – Unlock all civs:** Another gameplay tweak example is the “Unlock All Civs” mod, which removes the era prerequisite for later-era civs ([There are already Civilization 7 mods that improve the UI, unlock all civs, and add 'ludicrous'-sized maps | PC Gamer](https://www.pcgamer.com/games/strategy/there-are-already-civilization-7-mods-to-change-the-ui-unlock-all-civs-and-add-ludicrous-sized-maps/#:~:text=There%20are%20already%20Civilization%207,sized%20maps)) ([There are already Civilization 7 mods that improve the UI, unlock all civs, and add 'ludicrous'-sized maps | PC Gamer](https://www.pcgamer.com/games/strategy/there-are-already-civilization-7-mods-to-change-the-ui-unlock-all-civs-and-add-ludicrous-sized-maps/#:~:text=the%20Civ%207%20Unlock%20All,all%20immediately%20available%20to%20you)). How was this done? Likely by editing the table that requires certain conditions to enable a civ/leader. Civ7 might have something like a `LeaderRequirements` or `CivilizationEnabledRequirements` table. The mod probably updated those requirements to none. For instance, if a leader normally requires reaching the Exploration Age, the mod could set that requirement to null or Antiquity, thus making them selectable from the start. This is a case of modding game rules to change progression.  

  As you can see, the pattern is: **identify the game data you want to change, then use an <Update> or <Replace> to alter it**. Always double-check that your XML targets a valid table and that the WHERE clause finds the right row (the game won’t crash if it doesn’t find a match, but then your change does nothing). The logs can help verify if an Update ran – any SQL errors will appear in Modding.log. If you see errors, you might have the wrong table name or a typo in a column name.  

**3.2 Adding New Gameplay Content:**  
In addition to modifying existing entries, you can add entirely new content: new units, buildings, resources, technologies, even new eras or rules. The process is similar to adding a new civilization (which we did in Section 2): you insert new rows into the relevant tables, then reference them appropriately. A few tips for common additions:  

- **New Units:** Use the **Units** table to add a unit. Provide all necessary info (UnitType, Name, domain (land/sea/air), combat strength if combat unit, movement, cost, prerequisite tech or civic, etc.). Also add entries to sub-tables like Unit_Upgrades (if it upgrades from another unit), UnitAbilities (if it has special abilities), etc., as needed. If the unit is unique to a civ, tie it via `PrereqCivilization` in the Units row (if that column exists) or a separate mapping table. Ensure you also provide text (unit name and description, Civilopedia entry if you like) in your Text file. Without mod tools, you’ll likely reuse an existing unit’s art for your new unit unless you’re an artist replacing models. But you can assign a unique icon by adding it to icons atlases (see Best Practices for icons).  

- **New Buildings/Districts:** Similar to units, insert into Buildings or Districts table with all required fields (yields, prerequisites, etc.). If unique, link to civ. If it’s a world wonder, set Wonder = true and other special properties. Add any new art or icons if available.  

- **New Technologies or Civics:** You could extend the tech tree by adding a tech. This is advanced – you must place it in the tech tree by setting prerequisites and era. The game might lay it out automatically, but without the official WorldBuilder, this can be tedious. It’s doable by editing the Tech tree XML: adding to Technologies table and linking in TechnologyPrereqs and TechnologyQuotes (for Eureka quotes) if desired. Community templates or examples (once someone does it) can guide you. A simpler approach is modifying existing techs (like changing which units they unlock or their cost) rather than adding new ones, until tools make visualizing a new tech easier.  

- **Gameplay Rules and Mechanics:** Civ7 has new mechanics (e.g. population dynamics, city cap, “Independent People” (minor civs), etc.). Many of these are controlled by global parameters or XML tables. For instance, you could change how many **Codices** (the legacy resource) are needed to progress through an Age by updating Age progression parameters. Or adjust **city growth rates** and resource yields by tweaking global defines. Always search the base XML for terms related to what you want to change. The community “Modding Discoveries” thread often posts snippets; e.g., they found where GlobalParameters are split by relevant files ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=match%20at%20L793%20it%27s%20split,of%20the%20Antiquity%20Global%20Parameters)). If you wanted to change something like the number of turns in each game speed, you’d find the `GameSpeeds.xml` (mentioned on Steam discussions ([Deciphering the 'game-speeds.xml' file... :: Sid Meier's Civilization VII ...](https://steamcommunity.com/app/1295660/discussions/0/591762563949202064/?l=spanish#:~:text=Deciphering%20the%20%27game,the%20setting%20actually%20refers%20to))) and mod those entries.  

**3.3 Scripting and Advanced Gameplay Mods:**  
Without a DLL or official API yet, truly custom game logic (like new victory conditions or complex triggered events) is limited. However, Civ7 does have a scripting layer. Notably, Civ7 switched to **JavaScript for game scripts** (presumably using a system similar to Lua but with JS) ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=Oh%20darn,goes%202%20years%20of%20preparation)). The core game likely uses JS scripts for things like AI behavior, random events, etc., found in files like `aibase.xml` and others (some Steam users have peeked at these ([My game is a little improved at least, after a lot of file tweaking](https://steamcommunity.com/app/1295660/discussions/0/600771622034498946/?l=turkish#:~:text=tweaking%20steamcommunity,Row%20ListType))). In theory, you could write JS scripts to create custom gameplay behaviors. For example, a modder might write a JS function to automatically grant a bonus when a certain condition is met and integrate that via a **Gameplay Script** action. In practice, doing so now is tricky: we lack documentation of available game APIs in JS. But keep this in mind: if you have a concept that can’t be done with XML alone (say, a dynamic event that isn’t in base game), you might need to script it. You would include the .js file in your mod and add it via an Action (Civ6 used `<AddGameplayScripts>` to include a Lua; Civ7 may have an analogous way or could auto-run certain script files placed in the mod).  

For now, most gameplay changes can be done with the **database approach (XML/SQL)**. The devs have not yet provided the C++ source or any DLL for deeper changes (and as one modder noted, the game’s core logic is packed and locked with Denuvo currently ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=,3))). So we are constrained to what the data and JS scripting allow. Fortunately, that covers a **lot** – you can essentially rebalance the game, add content, or even overhaul mechanics by tweaking values and using creative combinations of modifiers. 

**Recap:** *Use XML/SQL updates to modify stats and rules ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Code%3A)), and use inserts to add new content. Test changes in-game and check logs to confirm your mod is doing what you expect.* In the next section, we’ll pivot to modding the **User Interface (UI)** – making quality-of-life improvements or custom displays, which has been a major focus of early Civ7 mods.

## **4. UI Enhancements**  
Civ VII’s interface at launch had room for improvement, and modders jumped on UI mods immediately. Unlike gameplay data (which use the “game” database), UI modding involves editing or replacing the files that control the interface (menus, tooltips, etc.). Civ7 uses JavaScript (and likely HTML/CSS or a similar UI framework under the hood) for its UI elements, which is a change from Civ6’s Lua-based UI ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=Oh%20darn,goes%202%20years%20of%20preparation)). Here’s how you can enhance the UI via mods:

- **Identifying UI Files:** The game’s UI files are stored in the installation directory, likely under a UI folder (exact structure may be something like *Base\Assets\UI* or *Base\UI*). These files could be `.js` for logic and some form of layout markup (maybe .xml or .json for the UI layout). Early mods have targeted specific files. For example, **tooltips** and **info screens** were modded by editing their JS. Community UI mods such as “Improved Plot Tooltip” and “Simple UI Adjustments” have revealed some file targets. Sukritact’s *Simple UI Adjustments* mod adds many enhancements to tile tooltips, city banners, etc. ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=The%20Simple%20UI%20Adjustments%20mod%2C,menus%20to%20find%20specific%20information)), indicating he modified the code that generates those UI components. Another mod “Improved Mod Page” changes the in-game Mods browser interface (likely by editing the Mods menu screen file). 

- **Making a UI Change:** Let’s say you want to do something simple, like show additional info in the tooltip when hovering over a tile (plot). In Civ7, by default you see yields and maybe limited info. Suppose you want to also show if a Wonder is present and some stats (which the base UI might not display). You’d proceed as follows:  

  1. Find the UI script responsible for plot tooltips. (In Civ6, it was a Lua file named `PlotToolTip.lua`; in Civ7, possibly a JS file in a similar naming convention, or part of a unified tooltip script.) The *Improved Plot Tooltip* mod likely edited this. Indeed, that mod’s description says it *“displays a Total Yields value, improves Natural Wonder descriptions, adds improvement icons and tags, etc.”* ([TCS UI Mods | CivFanatics Forums](https://forums.civfanatics.com/threads/tcs-ui-mods.694803/post-16763598#:~:text=Description%20Various%20improvements%20to%20the,plot%20tooltip)) ([TCS UI Mods | CivFanatics Forums](https://forums.civfanatics.com/threads/tcs-ui-mods.694803/post-16763598#:~:text=status%20to%20you%20,is%20a%20Distant%20Lands%20plot)). This confirms the existence of a file generating plot yield icons and text.  

  2. Once identified, copy that file’s content from the game’s assets into your mod (preserve the folder path relative to a known root if needed). For example, create `UI/PlotToolTip.js` in your mod mirroring the original path.  

  3. Make your changes in the copied file. This could be editing a function to add an extra line of text or icon. In JS, you might locate where the tooltip text is assembled – adding something like:  
     ```js
     if (plot.hasWonder) {
       tooltipText += "[ICON_Wonder] " + plot.wonderName + ": " + plot.wonderDescription;
     }
     ```  
     (This is pseudo-code for illustration – the real code depends on how Firaxis structured the data). Essentially, inject your desired behavior.  

  4. Include this modified UI file in your mod’s actions. Civ7 doesn’t have official documentation yet, but likely you either use `<UpdateDatabase>` for UI files as well, or a specific UI action. Some modders have simply used `<UpdateDatabase>` to load modified `.xml` containing UI definitions. Another approach is using `<ReplaceUIScript>` or similar if provided. If unsure, you can attempt to load it like a database update (the game might treat UI definitions as data in some cases). The safe method: place the file in the correct relative path and use `<ImportFiles>` (a tag used in Civ6 modinfo for including loose files). For instance:  
     ```xml
     <ActionGroup id="MyUIChanges" scope="Game" criteria="Always">
         <Actions>
             <ImportFiles>
                 <Item>UI/PlotToolTip.js</Item>
             </ImportFiles>
         </Actions>
     </ActionGroup>
     ```  
     If Civ7’s mod loader sees a mod file with the same name as a base UI file, it may override the base one (especially if the paths match and mod is loaded after core).  

  5. Test in game. UI mods usually don’t require starting a new game; you can load a save or start any game to see UI changes. If the game UI breaks or you get a blank/buggy tooltip, something is off in the JS (check the **Javascript (or Lua) log**, often called `UI.log` or `Scripting.log` – Gedemon noted *Scripting.log* for map script errors ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=Scripting)), which might also catch UI script errors). Fix syntax or logic as needed.  

- **Examples of UI Enhancements:**  
  The community mods give great examples of what’s possible:  

  **Sukritact’s Simple UI Adjustments** – This mod implemented numerous QoL changes in the UI: horizontal unit icons so units are easier to select, city banner population breakdown (rural vs urban population), smaller yield icons on unworked tiles, richly detailed tooltips for Wonders (with big icons and descriptions), tags indicating if buildings are damaged/obsolete/ageless, etc. ([Sukritact's Simple UI Adjustments | CivFanatics Forums](https://forums.civfanatics.com/threads/sukritacts-simple-ui-adjustments.695023/#:~:text=,progress%2C%20obsolete%20or%20ageless)) ([Sukritact's Simple UI Adjustments | CivFanatics Forums](https://forums.civfanatics.com/threads/sukritacts-simple-ui-adjustments.695023/#:~:text=,Yields%20to%20the%20Plot%20Tooltip)). All these required editing various UI components (city banner script, tooltip script, etc.). The result is a much more informative UI, as shown in the screenshot below where a Wonder’s effects are displayed on hover.  

   ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact)) *Modded UI example: Sukritact’s UI Adjustments adds detailed information to tooltips (e.g., hovering Colosseum shows culture + happiness effects and that it’s ageless) ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=The%20Simple%20UI%20Adjustments%20mod%2C,menus%20to%20find%20specific%20information)). Many small UI tweaks like this greatly improve clarity.*  

  **TCS Improved Plot Tooltip** – Focused on one aspect, it adds total yields, icons, district info, and multiple units listing in the tile tooltip ([TCS UI Mods | CivFanatics Forums](https://forums.civfanatics.com/threads/tcs-ui-mods.694803/post-16763598#:~:text=Description%20Various%20improvements%20to%20the,plot%20tooltip)) ([TCS UI Mods | CivFanatics Forums](https://forums.civfanatics.com/threads/tcs-ui-mods.694803/post-16763598#:~:text=status%20to%20you%20,is%20a%20Distant%20Lands%20plot)). The modder (thecrazyscot) likely adjusted the tooltip generation to aggregate yields and loop through all units on a tile (instead of just the top unit). This involves some coding but demonstrates that even without source code, one can manipulate the UI logic.  

  **Improved Mod Manager Page** – This mod by thecrazyscot revamps the in-game Mods browser UI (for example, to better show mod details or load order). It shows UI mods can also target front-end screens (not just in-game HUD).  

- **Adding New UI Elements:** If you’re ambitious, you could create entirely new UI panels or screens via mods. For instance, a “Civilization Overview” panel that lists all civs and their abilities (if one isn’t in base game). You would craft an HTML/JS UI file and integrate it, perhaps triggered by a new button. Doing this without toolkit is challenging but possible if you reverse-engineer how existing menus are invoked. (Likely beyond the scope of this guide, but keep in mind for future mod tool releases.)  

- **UI Mod Loading Order:** One caution: if multiple mods edit the same UI file, whichever loads last will win (override the others). Currently, without a mod manager controlling load order, it might be first-come or alphabetical by mod ID. To ensure compatibility, coordinate with other modders or design mods to edit different parts of the UI. As of now, there aren’t many UI mods, but as the library grows, conflicts could arise (e.g., two mods both altering the plot tooltip). In such cases, merging their changes into one mod or picking one will be necessary until mod tools allow merging changes.  

In summary, **UI modding involves editing the game’s JS/HTML UI files to alter or enhance what is displayed**. The CivFanatics forums and modding threads are invaluable for figuring out which file to edit for a given change. As you succeed with small tweaks, you can try bigger UI changes. Always test thoroughly – a broken UI script can hinder gameplay or menus. 

## **5. Maps and Scenario Creation**  
Creating custom maps and scenarios in Civ VII is one of the more challenging aspects pre-toolkit, but the community has already made progress. There are two main approaches to map modding: **custom map scripts** (procedural generation) and **static maps (scenario-style)**. We’ll also touch on scenario setups.

**5.1 Custom Map Scripts (Procedural Maps):**  
Civ7’s map generation is script-driven (likely in JavaScript as well, given the extension .js mentioned in templates). You can create a new map script to generate worlds with different algorithms – for example, a script that makes a highlands map, or one that generates a real-world Earth map with random start positions. 

Firaxis collaborator Gedemon provided a **Map Script Mod Template** for Civ7 ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=)) ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=A%20mod%20template%20to%20add,map%20scripts%20into%20the%20game)). Using it, you can add a new map script mod easily:

- **Use the Template:** Download or copy the template structure ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=MapScript%20Mod%20Template)). The template mod includes: a .modinfo (named something like `mapscript-template.modinfo`), a `config.xml`, and an example script (in the template, a modified Continents script called `continent-mod.js`). 

- **Rename and Identify:** Change the mod folder name and .modinfo filename to your liking (e.g., “YourName_NewMap.modinfo”). Inside the .modinfo, give it a unique mod id (e.g., “yourname-newmap”) and name/description as usual ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=Code%3A)). 

- **Match the Mod ID in Config:** The key trick with map scripts: In the template’s **config.xml**, there is a `<Maps>` table entry that uses the mod’s ID in curly braces to reference the script file ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=Code%3A)). For example:  
  ```xml
  <Maps>
    <Row File="{gedemon-newcontinent}maps/continent-mod.js" 
         Name="LOC_MAP_MAPSCRIPT_TEMPLATE_CONTINENT_NAME" 
         Description="LOC_MAP_MAPSCRIPT_TEMPLATE_CONTINENT_DESCRIPTION" 
         SortIndex="9"/>
  </Maps>
  ```  
  You must replace `gedemon-newcontinent` (the example mod ID) with **your mod’s id** so that the path correctly points to your script ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=The%20ID%20must%20also%20be,path%20to%20the%20mapscript%20file)). In our case, if mod id is “yourname-newmap”, the File attribute becomes `File="{yourname-newmap}maps/YourScriptName.js"`. This tells the game to load your JS file as a map script. The `Name` and `Description` are LOC keys for the map’s name/description in the setup menu – change those to unique keys and define them in your Text file (so players see a nice name like “New Highlands Map” and a description). `SortIndex` determines where it appears in the map list order (9 in the example, adjust as needed to place your map in the menu ordering).  

- **Write/Modify the Script:** The template’s example (`continent-mod.js`) was a copy of the base Continents script with a tweak (no forced ocean separation) ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=The%20included%20example%20script%20is,without%20any%20forced%20ocean%20separation)). You can use it as a starting point. If you want to make a Highlands map, you might start from the “Pangaea” or “Shuffle” script and modify terrain generation to favor hills. The scripts likely use a combination of noise generation and predefined settings (similar to Civ6’s map scripts in Lua). Without documentation, expect some trial and error. Use the Scripting.log to debug prints or errors from your script (the template suggests checking *Scripting.log* for errors when the map fails to load ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=Scripting))). The community on CivFanatics is actively experimenting, so check the **Civ7 - Maps and Map Scripts** forum for shared knowledge. One user tried making a Highlands map with the template and encountered an error, which they debugged via logs ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=I%27ve%20tried%20making%20a%20highlands,critical%20map%20error%20on%20load)) ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=,3)). Gedemon’s template and advice (e.g., how to handle map size limits) are great resources.

- **Testing the Map Script:** After installing your map script mod (just like any mod, drop in Mods folder ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=A%20mod%20template%20to%20add,map%20scripts%20into%20the%20game)) and ensure .modinfo is correct), launch Civ7. In the game setup, under Map Type, your custom map name should appear (with the Name you provided in LOC). Select it, choose map size, etc., and start a game. If generation fails, the game might pop an error or fallback to a default map. Then check *Scripting.log* for clues. Common issues: forgetting to include the script in .modinfo actions (make sure config.xml is loaded via UpdateDatabase action, and the .js is referenced in config as above), or script runtime errors (maybe a variable undefined). Print statements or iterative testing will help. Once it works, you’ll have a new map type available to all players using your mod.  

**Use Case – Larger Maps:** The community’s famed map mod **YnAMP (Yet Not Another Maps Pack)** has an early Civ7 version ([MOD: Unlocking Map Types (large, huge, massive) :: Sid Meier's Civilization VII General](https://steamcommunity.com/app/1295660/discussions/0/591762729907261573/#:~:text=MOD%3A%20Unlocking%20Map%20Types%20,huge%2C%20massive)). It unlocked larger map sizes (“Large, Huge, Massive”) beyond the base game’s limit and even includes a preliminary Earth map. This was achieved by adding new map size definitions and a world map script. Specifically, Civ7 had a hard cap of 128 tiles width for maps, which YnAMP extended to 230x116 for “Ludicrous” (though noted as experimental) ([There are already Civilization 7 mods that improve the UI, unlock all civs, and add 'ludicrous'-sized maps | PC Gamer](https://www.pcgamer.com/games/strategy/there-are-already-civilization-7-mods-to-change-the-ui-unlock-all-civs-and-add-ludicrous-sized-maps/#:~:text=match%20at%20L166%20lists%20experimental,230x116%29%20to%20test%20out)). To do this yourself, you’d adjust the **Maps** or **MapSizes** table – presumably adding new size options with dimensions and maybe adjusting some internal limits. YnAMP likely used the template method to register a new script or included an Earth map layout. If you want a specific known map (like Earth or Europe), one approach is writing a script that lays out terrain exactly as desired (essentially reading from a predefined grid of terrain data). Another approach could be to import a Civ6 map file if format is similar, but that’s speculative. For now, using a script is the way.  

**5.2 Static Maps and Scenarios:**  
Creating a scenario (fixed map with specific civ placements, units, and custom rules) is harder without a WorldBuilder, but not impossible for simple cases:

- **Static Map (Fixed Geography):** If you want a specific map (e.g., real Earth), you can script it as mentioned. Another method: if you have a grid of terrain, you can encode it in a script or maybe via a CSV/JSON that the script reads. Civ6 modders sometimes used external tools to convert images to map scripts. In Civ7, until a map editor exists, a handcrafted script is needed. Once done, you can also fix starting positions by assigning coordinates to civs in the script (YnAMP likely does True Start Locations by hardcoding coordinates for each civ’s start). This requires knowing how to spawn civs in script – not trivial, but possibly via certain API calls (Civ6 had StartPositioner logic in Lua; Civ7 may expose something similar in JS). 

- **Custom Scenarios (Rules & Setup):** Scenarios often have custom rules (e.g., unique victory conditions, turn limits, pre-placed units). Without official scenario support, you can simulate some aspects:
  - **Pre-placed units/cities:** Possibly achievable via a custom map script: after laying terrain, explicitly place units or cities for certain players. If JS allows access to the game state during map generation, you could create units at coordinates belonging to specific civs. It’s unclear if Civ7’s script environment lets you directly add units (it might, since scenarios exist in official content). If not, you might need a gameplay script that runs on first turn to place units. 
  - **Custom victory or turn limit:** The game might allow mods to disable certain victories or end the game at a specific turn via GlobalParameters or VictoryDefinitions. For example, to make a scenario that lasts 50 turns, set a parameter for max turns or create a victory triggered at turn 50 (like check turn number in a script and then declare winner by score). This is complex but doable with scripting. 
  - **Scenario-specific rules:** You can include a mod modifying rules just for that scenario. Perhaps have a criteria in .modinfo that only applies your changes when a specific game mode or map is active (not sure if Civ7 supports scenario-specific criteria out of the box; Civ6 had <Maps> criteria or specific rule sets). If not, you simply instruct users to enable the mod when playing that scenario. 

Given the complexity, **most scenario-style mods right now stick to providing a map and maybe some minor rule tweaks**, rather than full story scenarios. Expect that when Firaxis releases official tools, a WorldBuilder will simplify this – you’d paint terrain, drop units, and export a scenario mod directly. Until then, creating scenarios is largely for the brave and technically inclined. Start with easier goals like “make a big Earth map where each civ starts in historical location”. Then you can gradually add bells and whistles (maybe independent cities, custom events, etc., via scripts). 

**Testing Maps/Scenarios:** Always test with various civ counts and see if all players spawn correctly. If using more than the default number of civs (8 in a standard game), note that UI might not display them all (some mods needed to adjust UI to list more than 8 civs). There is a mod specifically to increase the supported number of players beyond 8 ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=,Click%20to%20expand)) ([Any modders working on increasing Settlement limit? | CivFanatics Forums](https://forums.civfanatics.com/threads/any-modders-working-on-increasing-settlement-limit.695434/#:~:text=There%20are%20two%20ways%20to,has%20on%20happiness%2C%20if%20any)), which involved tweaking interface and game limits. Keep that in mind if you attempt a massive 12-player world scenario – you may need a companion UI mod to show all player listings. 

## **6. Best Practices for Packaging and Testing Mods**  
Modding Civ7 can be complex, but following best practices will save you headaches and make your mods easier to share and maintain:

- **Unique Naming Conventions:** We’ve emphasized this, but it bears repeating: use unique identifiers everywhere. Prefix all your new **Types** (CivilizationType, LeaderType, TraitType, etc.) with something unique (e.g., YOURTAG_THING_NAME). Do the same for **LOC text keys** – e.g., start all your mod’s text tags with `LOC_MOD_YOURNAME_...`. This prevents collisions if another mod coincidentally uses the same name. Civ7’s content is extensive, so a generic name might clash with an official item or another mod. Unique prefixes (your mod or author name) act as a namespacing.  ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Note%20that%20the%20mod%20id,important%20and%20should%20be%20unique))

- **Organization of Files:** Keep your mod files organized logically:
  - Group related SQL/XML into files (as we did with NewCivData.xml and NewCivText.xml). You might further split files if your mod is big; for instance, `Leaders.xml`, `Units.xml`, `Buildings.xml` separately. The .modinfo can list multiple <Item> entries under one UpdateDatabase action or have multiple ActionGroups. It’s often easier to debug smaller files. However, for a small mod, one XML for all gameplay and one for all text is fine. 
  - Use subfolders (Data, Text, UI, Maps, etc.) to keep things tidy. This also helps anyone browsing your mod to find what they need to edit or understand.
  - If you add images (icons), follow the structure Civ7 expects. Typically, icon atlases in Civ6 were defined in XML and images placed in an **Icons** folder. Civ7 likely uses a similar approach or possibly a unified .xcassets (as the CivFanatics thread had a user named xcassets discussing something – xcassets suggests an asset bundle). If needed, include DDS/PNG files and an atlas definition XML linking your icon keys (like ICON_CIV_MY_NEW_CIV) to the textures. Without the Asset Editor, making new 2D icons is one of the easier tasks: you can create a DDS (256x256 for leaders, 128x128 for smaller icons, etc.) and use the same XML schema from Civ6 for IconTextureAtlases and IconDefinitions. This is somewhat advanced, but plenty of Civ6 guides cover adding custom icons and they likely apply to Civ7.

- **Balancing and Consistency:** If you create new content (civs, units, etc.), try to balance them relative to existing ones. Overpowered mods can be fun but might turn off some players. Use existing data as a guideline (our Medjay example turning combat to 100 was deliberately over-the-top as a demo ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=I%27m%20happy%20to%20post%20an,and%20gives%20them%20100%20strength)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=The%20strength%20update%20for%20the,Medjay%20is%20simple))!). For a real mod, you might set values more reasonably. Playtest your changes – does your civ steamroll others or lag behind? Adjust as needed.

- **Testing Iteratively:** Don’t try to do everything at once. Enable logging (in Civ6 you’d set “EnableDebugMenu 1” and “EnableTuner 1” in AppOptions.txt – check if Civ7 has similar options to ensure logs are verbose). Then:
  1. Add a small change (e.g., define the civ with one leader). Test if it shows up.
  2. Then add the second leader, test again.
  3. Then add a unique unit, test building it in-game.  
  This stepwise approach helps isolate issues. If you added 10 things at once and something’s wrong, it’s harder to pinpoint.  

- **Using Logs:** Civ7 logs are your best friend in troubleshooting. Key logs include:
  - **Database.log:** Logs SQL execution. If an <Update> fails (perhaps due to a typo in a column name), it often notes an error here.
  - **Modding.log:** Logs the mod loading process. It will list which files were loaded for your mod and any XML parsing errors. If your mod isn’t taking effect at all, check here to see if it was marked invalid.
  - **Lua.log or equivalent Scripting.log:** For UI or map scripts, this is where runtime errors or prints appear.
  - Logs are found in *Documents/My Games/Sid Meier’s Civilization VII/Logs*. Open them in a text editor after running the game with your mod. Search for your mod’s name or components. It can be overwhelming, but you can often find lines like “Error: invalid Reference on Leaders.SomeColumn” which tells you something’s off.

- **Do Not Directly Edit Base Files:** This is a common modding rule – and it applies here. While you *can* tweak the game by editing the files in `Base\Modules\...`, those changes are not portable (and may get overwritten by patches). Always create a mod to make changes. Mods can be enabled/disabled easily, and multiple mods can coexist. The only time you might edit base files is for personal experimentation. But if you intend to share your work or keep it for the long term, encapsulate it in a mod. (One exception: until mod support, some players edited files to fix things; but now that mods load, it’s better to use mods).  

- **Compatibility Considerations:** If you plan to distribute your mod, think about what it might conflict with:
  - If two mods add a civ with the same name or internal ID, conflict. (Avoid by unique naming as discussed.)
  - If two mods change the same game value (e.g., both try to update Spearman combat), one will override the other. Not much you can do except communicate – or make a combined balance mod.
  - Total conversion mods (if they come) likely shouldn’t be mixed with other mods – but that’s for the future. Right now, mixing smaller mods (one UI, one civ, one unit tweak) should work fine. The Additional Content menu lets you enable/disable mods individually. 
  - If a patch comes out, double-check your mod. New official content might introduce IDs that clash with your placeholders if they were too generic, or a patch might rename something you were targeting. Test and update your mod for each game patch to ensure compatibility. CivFanatics will be a good place to see if a patch affected mods (as modders will report broken mods and fixes).

- **Packaging Your Mod:** To share your mod with others (before Steam Workshop is live for Civ7), package it as a .zip of your mod folder. Make sure to exclude any unnecessary personal files. Provide instructions to users to unzip it into their Mods folder. Include a README if you have special instructions (especially for scenarios or if certain mod options must be toggled). The CivFanatics **Downloads** section ([MOD: Unlocking Map Types (large, huge, massive) :: Sid Meier's Civilization VII General](https://steamcommunity.com/app/1295660/discussions/0/591762729907261573/#:~:text=For%20those%20who%20want%20to,alpha)) is a great place to upload your mod; many Civ7 mods are already hosted there. When Workshop support comes, you will likely import your mod through the official uploader (but that’s future info).

- **Documentation and Comments:** Comment your XML/SQL if needed (XML supports `<!-- comments -->`). Future you, or other modders looking at your mod, will appreciate notes on what a section does. For complex mods, keep a changelog. In the .modinfo you can increment the version and perhaps include in Description what changed.

- **Learn from Others:** Keep an eye on Civ7 modding forums. The **CivFanatics Civ7 Creation & Customization** forum is rapidly accumulating tutorials, examples, and answers to tricky questions. The “Modding discoveries” thread ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=It%27s%20interesting%20that%20the%20Age,each%20has%20a%20modinfo%20file)) ([Modding discoveries | CivFanatics Forums](https://forums.civfanatics.com/threads/modding-discoveries.694816/#:~:text=,Click%20to%20expand)) and others contain gold nuggets like lists of base .modinfo files, engine quirks, etc. If you’re stuck, chances are someone else encountered a similar issue – search the forum or ask. Even Civ6 modding guides can be helpful, as Civ7’s systems are “similar to Civ6, with XML etc.” ([
Civilization VII – Features Post | TL;DR Movie Reviews and Analysis	](https://tldrmoviereviews.com/2024/06/08/civilization-vii-features-post/#:~:text=Modding)) (as a features preview noted). Just be cautious to apply only what’s relevant to Civ7 (file paths and some mechanics changed). 

With these best practices, you’ll create cleaner and more robust mods. Modding is often an iterative learning process – even veteran modders go through trial and error when a new Civ game comes out. Civ VII modding is still in its early stages (no official tools yet, as of early 2025), but you now have the foundational knowledge to start creating content and improvements. We’ve covered setting up a mod, adding a new civ with leaders, changing game data, enhancing UI, creating maps, and packaging mods for use. Now it’s up to your creativity to bring new life to *Civilization VII*.

Good luck, have fun modding, and may your new civilizations stand the test of time! 

**Sources:** Community modding threads and resources were referenced to ensure accuracy (e.g., Firaxis example mod on CivFanatics ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=Code%3A)) ([Example gameplay mod | CivFanatics Forums](https://forums.civfanatics.com/threads/example-gameplay-mod.694844/#:~:text=%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf,Medjay%3C%2FText%3E%20%3C%2FReplace%3E%20%3C%2FEnglishText%3E%20%3C%2FDatabase)), Gedemon’s map script template ([A template mod to add new map scripts | CivFanatics Forums](https://forums.civfanatics.com/threads/a-template-mod-to-add-new-map-scripts.694913/#:~:text=%3CMaps%3E%20%3CRow%20File%3D%22%7Bgedemon,%3C%2FMaps)), and early mod announcements ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Civilization%207%20isn%E2%80%99t%20available%20to,should%20show%20up%20as%20enabled)) ([Civ 7 isn’t even out yet and there’s already a mod fixing its UI | Polygon](https://www.polygon.com/news/521547/civilization-civ-7-ui-mod-sukritact#:~:text=Even%20though%20the%20game%20has,certain%20prerequisites%20during%20certain%20ages))). These provide insight into Civ7’s mod structure and have been cited throughout the guide for deeper reading on specific points. Happy modding!
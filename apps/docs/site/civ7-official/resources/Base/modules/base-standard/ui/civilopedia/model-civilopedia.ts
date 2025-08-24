/**
 * model-civilopedia.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for the Civilopedia
 */

import ContextManager from '/core/ui/context-manager/context-manager.js'

export interface Page {
	sectionID: string;
	pageID: string;
}

export enum DetailsType {
	Section,
	PageGroup,
	Page
}

export interface PageGroupDetails {
	detailsType: DetailsType.PageGroup;
	sectionID: string;
	pageGroupID: string;
	nameKey: string;
	tabText: string;
	visibleIfEmpty: boolean;
	sortIndex: number;
	collapsed: boolean;
}

export interface PageDetails {
	detailsType: DetailsType.Page;
	sectionID: string;
	pageID: string;
	nameKey: string;
	tabText: string;
	titleText: string | null;
	subTitleText: string | null;
	pageGroupID: string | null;
	pageLayoutID: string;
	sortIndex: number;
	textKeyPrefix: string | null;
}

export interface SectionDetails {
	detailsType: DetailsType.Section;
	sectionID: string;
	nameKey: string;
	tabText: string | null;
	icon?: string;
	sortIndex: number;
}

export interface ChapterParagraph {
	textKey: string;
	sortIndex: number;
}
export interface ChapterOverrideDetails {
	headerKey: string | null;
	body: ChapterParagraph[];
}

export interface ChapterDetails {
	chapterID: string,
	pageLayoutID: string,
	headerKey: string | null,
	sortIndex: number
}

export interface CivilopediaSearchResult {
	page: Page;
	details?: SearchResult;
}

const CIVILOPEDIA_SEARCH_CONTEXT = 'Civilopedia';

class Civilopedia {

	private _NavigatePageEvent: LiteEvent<Page> = new LiteEvent<Page>();
	private _History: Page[];
	private _HomePage: Page;
	private _CurrentPage: Page;
	private _CurrentHistoryIndex: number;
	private _MaxHistoricEntries: number;
	private _isOpen: boolean = false;

	private sections: SectionDetails[];
	private chapterOverrides: Map<string, ChapterOverrideDetails>;
	private chapterBodyQueries: Map<string, CivilopediaPageLayoutChapterContentQueryDefinition>;
	private chaptersByLayout: Map<string, ChapterDetails[]>;
	private pageGroupsBySection: Map<string, PageGroupDetails[]>;
	private pagesBySection: Map<string, PageDetails[]>;
	private pagesByUUID: Map<string, PageDetails>;

	private civilopediaHotkeyListener: EventListener = this.onCivilopediaHotkey.bind(this);

	constructor() {
		this.sections = [];
		this.chapterOverrides = new Map<string, ChapterOverrideDetails>();
		this.chapterBodyQueries = new Map<string, CivilopediaPageLayoutChapterContentQueryDefinition>();
		this.chaptersByLayout = new Map<string, ChapterDetails[]>();
		this.pageGroupsBySection = new Map<string, PageGroupDetails[]>();
		this.pagesBySection = new Map<string, PageDetails[]>();
		this.pagesByUUID = new Map<string, PageDetails>();

		this.initialize();

		if (this.sections.length == 0) {
			throw new Error("No civilopedia sections exist!");
		}

		const firstSection = this.sections[0];
		const pages = this.pagesBySection.get(firstSection.sectionID);
		if (pages && pages.length > 0) {
			this._HomePage = {
				sectionID: firstSection.sectionID,
				pageID: pages[0].pageID
			}
		}
		else {
			throw new Error("No pages for section!");
		}

		this._CurrentPage = this._HomePage;
		this._History = [this._CurrentPage];
		this._CurrentHistoryIndex = 0;
		this._MaxHistoricEntries = 10;

		window.addEventListener('hotkey-open-civilopedia', this.civilopediaHotkeyListener);
	}

	set isOpen(value: boolean) {
		this._isOpen = value;
	}

	get isOpen() {
		return this._isOpen;
	}

	/**
	 * The intro/home page of the pedia.
	 */
	get homePage(): Page {
		return this._HomePage;
	}

	/**
	 * The current page the user is viewing.
	 */
	get currentPage(): Page {
		return this._CurrentPage;
	}

	/**
	 * This value represents the index into the history array that the current page is at.
	 * 0 = The most recent page.
	 */
	get currentHistoryIndex(): number {
		return this._CurrentHistoryIndex;
	}

	/**
	 * The list of pages visited by the user in chronological order.
	 */
	get history(): Page[] {
		return this._History;
	}

	get maxHistoricEntries(): number {
		return this._MaxHistoricEntries;
	}

	set maxHistoricEntries(value: number) {
		this._MaxHistoricEntries = value;
		if (this._MaxHistoricEntries > 0) {
			this.truncateHistory(this._MaxHistoricEntries);
		}
	}

	/**
	 * Returns true if the user can navigate forward in the history.
	 */
	canNavigateForward(): boolean {
		return this.currentHistoryIndex > 0;
	}

	/**
	 * Returns false if the user can navigate backwards in the history.
	 */
	canNavigateBackwards(): boolean {
		return this.currentHistoryIndex < this.history.length - 1;
	}

	/**
	 * Purges all history.
	 */
	clearHistory(): void {
		this._History = [this.currentPage];
		this._CurrentHistoryIndex = 0;
	}

	/**
	 * Reduces the history to the `maxItems` recent items.
	 * @param maxItems The maximum items to include in the history.
	 */
	truncateHistory(maxItems: number) {
		this._History.splice(maxItems)
	}

	/**
	 * Navigates to the front/home page of the pedia.
	 */
	navigateHome(): void {
		this.navigateTo(this.homePage);
	}

	/**
	 * Navigates back in the history.
	 * Returns false if page no longer exists or there is no further pages in the history.
	 */
	navigateBack(numPagesBack: number = 1): boolean {
		if (this.canNavigateBackwards()) {
			this._CurrentHistoryIndex += numPagesBack;
			const page = this.history[this._CurrentHistoryIndex];
			if (this.doNavigate(page)) {
				this._NavigatePageEvent.trigger(page);
				return true;
			}
		}

		return false;
	}

	/**
	 * Navigate forward in the history.
	 * Returns false if page no longer exists or there is no further pages in the history.
	 */
	navigateForward(numPagesForward: number = 1): boolean {
		if (this.canNavigateForward()) {
			this._CurrentHistoryIndex -= numPagesForward;
			const page = this.history[this._CurrentHistoryIndex];
			if (this.doNavigate(page)) {
				this._NavigatePageEvent.trigger(page);
				return true;
			}
		}

		return false;
	}

	/** 
	 * Navigate to the desired page. 
	 */
	navigateTo(page: Page): boolean {
		if (this.doNavigate(page)) {
			this._History.splice(0, this._CurrentHistoryIndex, page);
			if (this._MaxHistoricEntries > -1) {
				this.truncateHistory(this._MaxHistoricEntries);
			}

			this._CurrentHistoryIndex = 0;
			this._NavigatePageEvent.trigger(page);
			return true;
		}
		else {
			return false;
		}
	}

	/** 
	 * Navigate to the page we were on when we closed the civilopedia
	 */
	navigateToLastPageInHistory(): boolean {
		if (this.history.length > 0) {
			const page = this.history[this._CurrentHistoryIndex];
			if (this.doNavigate(page)) {
				this._NavigatePageEvent.trigger(page);
				return true;
			}
		}
		return false
	}

	/**
	 * Perform a search with the given term.
	 * @param term The term(s) to search for.
	 * @returns The results from the search, which can then be fed into `navigateTo`. 
	 */
	search(term: string, maxResults?: number): CivilopediaSearchResult[] {
		if (maxResults == null) {
			maxResults = 5;
		}

		const results: CivilopediaSearchResult[] = [];

		// If the search term matches a specific page id, return that section/page.
		// If the search term matches a specific section id, return the first page
		// in that section.
		for (const sectionPages of this.pagesBySection) {
			const sectionID = sectionPages[0];
			if (term == sectionID) {
				const frontPage = sectionPages[1][0];
				results.push({ page: { sectionID: sectionID, pageID: frontPage.pageID } });
				if (results.length >= maxResults) {
					return results;
				}
			}
			else {
				for (const page of sectionPages[1]) {
					if (page.pageID == term) {
						results.push({ page: { sectionID: sectionID, pageID: page.pageID } });
						if (results.length >= maxResults) {
							return results;
						}
					}
				}
			}
		}

		// Neither found.  Time to do full text search!
		const searchResults = Search.search(CIVILOPEDIA_SEARCH_CONTEXT, term, maxResults);
		if (searchResults && searchResults.length > 0) {
			for (const result of searchResults) {
				const [sectionID, pageID] = result.type.split("|", 2);

				results.push({ page: { sectionID: sectionID, pageID: pageID }, details: result });
				if (results.length >= maxResults) {
					return results;
				}
			}
		}

		return results;
	}

	get onNavigatePage(): ILiteEvent<Page> {
		return this._NavigatePageEvent.expose();
	}

	/**
	 * Perform the actual navigation.
	 * @param page The page to navigate to.
	 * @returns True if navigated to a new page.
	 */
	private doNavigate(page: Page) {
		if (this._CurrentPage.sectionID != page.sectionID || this._CurrentPage.pageID != page.pageID) {

			const pageDetails = this.getPage(page.sectionID, page.pageID);
			if (pageDetails) {
				// Does this page exist within this section?
				this._CurrentPage = {
					sectionID: page.sectionID,
					pageID: page.pageID,
				};

				return true;
			}
			else {
				// Page not found.
				return false;
			}
		}
		else {
			// Already on that page.
			return false;
		}
	}

	/**
	 * Returns left-to-right list of sections w/ information.
	 */
	getSections(): SectionDetails[] {
		return this.sections;
	}

	/**
	 * Returns top - to - bottom list of pages including groups
	 * @param sectionID 
	 * @returns 
	 */
	getPages(sectionID: string): PageDetails[] | null {
		return this.pagesBySection.get(sectionID) ?? null;
	}

	/**
	 * Returns the first page structure with the specified section id and page id.
	 * @param sectionID 
	 * @param pageID 
	 * @returns 
	 */
	getPage(sectionID: string, pageID: string): PageDetails | null {
		const uuid = `${sectionID}::${pageID}`;
		return this.pagesByUUID.get(uuid) ?? null;
	}

	/**
	 * Returns the page groups in top-to-bottom order.
	 * @param sectionID 
	 * @returns 
	 */
	getPageGroups(sectionID: string): PageGroupDetails[] | null {
		return this.pageGroupsBySection.get(sectionID) ?? null;
	}

	/**
	 * Returns the first page group structure with the specified section id and page group id.
	 * @param sectionID 
	 * @param pageGroupID 
	 * @returns 
	 */
	getPageGroup(sectionID: string, pageGroupID: string): PageGroupDetails | null {
		const groups = this.pageGroupsBySection.get(sectionID);
		if (groups) {
			return groups.find((g) => { g.pageGroupID == pageGroupID }) ?? null;
		}
		return null;
	}

	/**
	 * Returns a list of ChapterIds pre - sorted.
	 * @param pageLayoutID 
	 * @returns 
	 */
	getPageChapters(pageLayoutID: string): ChapterDetails[] | null {
		return this.chaptersByLayout.get(pageLayoutID) ?? null;
	}

	/**
	 * Returns a single text key representing the heading of the chapter.
	 * @param sectionID 
	 * @param pageID 
	 * @param chapterID 
	 * @returns 
	 */
	getChapterHeader(sectionID: string, pageID: string, chapterID: string): string | null {
		const uuid = `${sectionID}|${pageID}|${chapterID}`;
		const override = this.chapterOverrides.get(uuid);
		if (override && override.headerKey) {
			return override.headerKey;
		}
		else {
			const page = this.getPage(sectionID, pageID);
			if (page) {
				const chapters = this.getPageChapters(page.pageLayoutID);
				if (chapters) {
					for (const ch of chapters) {
						if (ch.chapterID == chapterID) {
							if (ch.headerKey) {
								return ch.headerKey;
							}
							break;
						}
					}
				}
			}

			return this.findChapterTextKey(sectionID, pageID, chapterID, "TITLE");
		}
	}

	/**
	 * Returns a list of text keys representing separate paragraphs of a chapter.
	 * @param sectionID 
	 * @param pageID 
	 * @param chapterID 
	 * @returns 
	 */
	getChapterBody(sectionID: string, pageID: string, chapterID: string, pageLayoutID: string): string[] | null {
		const uuid = `${sectionID}|${pageID}|${chapterID}`;
		const override = this.chapterOverrides.get(uuid);
		if (override && override.body.length > 0) {
			return override.body.map(p => p.textKey);
		}
		else {
			const chapterBodyQuery = this.chapterBodyQueries.get(`${pageLayoutID}|${chapterID}`);
			if (chapterBodyQuery) {
				const paragraphs = Database.query('gameplay', chapterBodyQuery.SQL, pageID, sectionID);
				if (paragraphs) {
					const keys = [];
					for (let p of paragraphs) {
						const value = p.Text;
						if (typeof value == 'string' && Locale.keyExists(value)) {
							keys.push(value);
						}
					}
					if (keys.length > 0) {
						return keys;
					}
				}
			}
			else {
				const bodyKey = this.findChapterTextKey(sectionID, pageID, chapterID, "BODY");
				if (bodyKey) {
					return [bodyKey];
				}
				else {
					const keys = [];

					let i = 1;
					let key = this.findChapterTextKey(sectionID, pageID, chapterID, `PARA_${i}`);
					while (key) {
						keys.push(key);
						i++;
						key = this.findChapterTextKey(sectionID, pageID, chapterID, `PARA_${i}`);
					}

					if (keys.length > 0) {
						return keys;
					}
				}
			}
		}

		return null;
	}

	/**
	 * Returns the first found text key that conforms to the section search patterns.
	 * @param sectionID 
	 * @param tag 
	 */
	findSectionTextKey(sectionID: string, tag: string): string | null {
		const keys = [
			`LOC_PEDIA_${sectionID}_${tag}`,
		];

		return keys.find(k => Locale.keyExists(k)) ?? null;
	}

	/**
	 * Returns the first found text key that conforms to the page search patterns.
	 * @param sectionID 
	 * @param pageID 
	 * @param tag 
	 */
	findPageTextKey(sectionID: string, pageID: string, tag: string): string | null {
		const suffix = `_${tag}`;
		const keys = [
			`LOC_PEDIA_${sectionID}_PAGE_${pageID}${suffix}`,
			`LOC_PEDIA_PAGE_${pageID}${suffix}`,
			`LOC_PEDIA_PAGE_${tag}`
		];

		const page = this.getPage(sectionID, pageID);
		if (page) {
			const prefix = page.textKeyPrefix;
			if (prefix) {
				keys.unshift(
					`${prefix}_${pageID}${suffix}`,
					`${prefix}${suffix}`
				);
			}
		}

		return keys.find(k => Locale.keyExists(k)) ?? null;
	}

	/**
	 * Returns the first found text key that conforms to the chapter search patterns
	 * @param sectionID 
	 * @param pageID 
	 * @param chapterID 
	 * @param tag 
	 * @returns 
	 */
	findChapterTextKey(sectionID: string, pageID: string, chapterID: string, tag: string): string | null {
		const suffix = `_CHAPTER_${chapterID}_${tag}`;
		const keys = [
			`LOC_PEDIA_${sectionID}_PAGE_${pageID}${suffix}`,
			`LOC_PEDIA_${sectionID}_PAGE${suffix}`,
			`LOC_PEDIA_PAGE_${pageID}${suffix}`,
			`LOC_PEDIA_PAGE${suffix}`,
		];
		const page = this.getPage(sectionID, pageID);
		if (page) {
			const prefix = page.textKeyPrefix;
			if (prefix) {
				keys.unshift(
					`${prefix}_${pageID}${suffix}`,
					`${prefix}${suffix}`
				);
			}
		}

		return keys.find(k => Locale.keyExists(k)) ?? null;
	}

	private initialize() {
		const excludes = new Set<string>();

		const sections = this.sections;
		const sectionSet = new Set<string>();
		const pagesBySection = this.pagesBySection;
		const pageGroupsBySection = this.pageGroupsBySection;
		const pagesByUUID = this.pagesByUUID;

		function addPage(page: PageDetails) {
			const pageUUID = `${page.sectionID}::${page.pageID}`;
			if (!excludes.has(page.sectionID) && !excludes.has(pageUUID) && (page.pageGroupID == null || !excludes.has(`${page.sectionID}|:${page.pageGroupID}`))) {
				let pages: PageDetails[] | undefined = pagesBySection.get(page.sectionID);
				if (!pages) {
					pages = [];
					pagesBySection.set(page.sectionID, pages);
				}

				pages.push(page);
				pagesByUUID.set(pageUUID, page);
			}
		}

		function addPageGroup(pageGroup: PageGroupDetails) {
			const pageGroupExcludesKey = `${pageGroup.sectionID}|:${pageGroup.pageGroupID}`;
			if (!excludes.has(pageGroup.sectionID) && !excludes.has(pageGroupExcludesKey)) {
				if (sectionSet.has(pageGroup.sectionID)) {
					let pageGroups = pageGroupsBySection.get(pageGroup.sectionID);
					if (!pageGroups) {
						pageGroups = [];
						pageGroupsBySection.set(pageGroup.sectionID, pageGroups);
					}

					pageGroups.push(pageGroup);
				}
			}
		}

		// Determine what to exclude.
		if (GameInfo.CivilopediaSectionExcludes) {
			GameInfo.CivilopediaSectionExcludes.forEach((row) => {
				excludes.add(row.SectionID);
			});
		}

		if (GameInfo.CivilopediaPageExcludes) {
			GameInfo.CivilopediaPageExcludes.forEach((row) => {
				excludes.add(`${row.SectionID}::${row.PageID}`);
			});
		}

		if (GameInfo.CivilopediaPageGroupExcludes) {
			GameInfo.CivilopediaPageGroupExcludes.forEach((row) => {
				excludes.add(`${row.SectionID}|:${row.PageGroupID}`);
			});
		}

		// Cache sections.
		if (GameInfo.CivilopediaSections) {
			GameInfo.CivilopediaSections.forEach((row) => {
				if (!excludes.has(row.SectionID)) {
					const section: SectionDetails = {
						detailsType: DetailsType.Section,
						sectionID: row.SectionID,
						nameKey: row.Name,
						tabText: null,
						icon: row.Icon,
						sortIndex: row.SortIndex
					};

					sections.push(section);
					sectionSet.add(row.SectionID);
				}
			});
		}

		// Cache PageGroups and Pages.
		if (GameInfo.CivilopediaPageGroups) {
			GameInfo.CivilopediaPageGroups.forEach((row) => {
				const pageGroup: PageGroupDetails = {
					detailsType: DetailsType.PageGroup,
					sectionID: row.SectionID,
					pageGroupID: row.PageGroupID,
					nameKey: row.Name,
					tabText: row.Name,
					visibleIfEmpty: row.VisibleIfEmpty,
					sortIndex: row.SortIndex,
					collapsed: true
				}

				addPageGroup(pageGroup);
			});
		}

		if (GameInfo.CivilopediaPages) {
			GameInfo.CivilopediaPages.forEach((row) => {
				const page: PageDetails = {
					detailsType: DetailsType.Page,
					sectionID: row.SectionID,
					pageID: row.PageID,
					pageGroupID: row.PageGroupID ?? null,
					pageLayoutID: row.PageLayoutID,
					nameKey: row.Name,
					titleText: null,
					subTitleText: null,
					tabText: row.Name,
					textKeyPrefix: row.TextKeyPrefix ?? null,
					sortIndex: row.SortIndex
				}

				addPage(page);
			});
		}

		if (GameInfo.CivilopediaPageGroupQueries) {
			GameInfo.CivilopediaPageGroupQueries.forEach((row) => {
				const q = Database.query('gameplay', row.SQL);
				q?.forEach((r) => {

					if (typeof r.Name == 'string' &&
						typeof r.PageGroupID == 'string') {
						const visibleIfEmpty = (typeof r.VisibleIfEmpty == 'boolean') ? r.VisibleIfEmpty : false;
						const sortIndex = (typeof r.SortIndex == 'number') ? r.SortIndex : 0;
						const pageGroup: PageGroupDetails = {
							detailsType: DetailsType.PageGroup,
							sectionID: row.SectionID,
							pageGroupID: r.PageGroupID,
							nameKey: r.Name,
							tabText: r.Name,
							visibleIfEmpty: visibleIfEmpty,
							sortIndex: sortIndex,
							collapsed: true
						}
						addPageGroup(pageGroup);

					}
				});
			})
		}

		if (GameInfo.CivilopediaPageQueries) {
			const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;
			GameInfo.CivilopediaPageQueries.forEach((row) => {
				const q = Database.query('gameplay', row.SQL, currentAge ?? 'NO_AGE');
				q?.forEach((r) => {
					if (typeof r.PageID == 'string' &&
						typeof r.Name == 'string' &&
						typeof r.PageLayoutID == 'string') {
						const pageGroupID = (typeof r.PageGroupID == 'string') ? r.PageGroupID : null;
						const sortIndex = (typeof r.SortIndex == 'number') ? r.SortIndex : 0;
						const textKeyPrefix = (typeof r.TextKeyPrefix == 'string') ? r.TextKeyPrefix : null;
						const page: PageDetails = {
							detailsType: DetailsType.Page,
							sectionID: row.SectionID,
							pageID: r.PageID,
							pageGroupID: pageGroupID,
							pageLayoutID: r.PageLayoutID,
							nameKey: r.Name,
							titleText: null,
							subTitleText: null,
							tabText: r.Name,
							textKeyPrefix: textKeyPrefix,
							sortIndex: sortIndex
						};

						addPage(page);
					}
				});
			});
		}

		// Cache chapters by page layout
		if (GameInfo.CivilopediaPageLayoutChapters) {
			GameInfo.CivilopediaPageLayoutChapters.forEach((row) => {
				const chapter: ChapterDetails = {
					chapterID: row.ChapterID,
					pageLayoutID: row.PageLayoutID,
					headerKey: row.Header ?? null,
					sortIndex: row.SortIndex
				};

				let chapters: ChapterDetails[] | undefined = this.chaptersByLayout.get(row.PageLayoutID);
				if (!chapters) {
					chapters = [];
					this.chaptersByLayout.set(row.PageLayoutID, chapters);
				}

				chapters.push(chapter);
			});
		}

		// Sort layout chapters
		this.chaptersByLayout.forEach((chapters: ChapterDetails[]) => {
			chapters.sort((a: ChapterDetails, b: ChapterDetails) => {
				return a.sortIndex - b.sortIndex;
			});
		});

		// Cache chapter overrides
		if (GameInfo.CivilopediaPageChapterHeaders) {
			GameInfo.CivilopediaPageChapterHeaders.forEach((row) => {
				const chapterUUID = `${row.SectionID}|${row.PageID}|${row.ChapterID}`;
				let override: ChapterOverrideDetails | undefined = this.chapterOverrides.get(chapterUUID);
				if (!override) {
					override = {
						headerKey: null,
						body: [],
					};
					this.chapterOverrides.set(chapterUUID, override);
				}
				override.headerKey = row.Header;
				this.chapterOverrides.set(chapterUUID, override);
			});
		}

		if (GameInfo.CivilopediaPageLayoutChapterContentQueries) {
			GameInfo.CivilopediaPageLayoutChapterContentQueries.forEach((row) => {
				const uuid = `${row.PageLayoutID}|${row.ChapterID}`;
				this.chapterBodyQueries.set(uuid, row);
			})
		}

		if (GameInfo.CivilopediaPageChapterParagraphs) {
			GameInfo.CivilopediaPageChapterParagraphs.forEach((row) => {
				const chapterUUID = `${row.SectionID}|${row.PageID}|${row.ChapterID}`;
				let override = this.chapterOverrides.get(chapterUUID);
				if (!override) {
					override = {
						headerKey: null,
						body: [],
					};
					this.chapterOverrides.set(chapterUUID, override);
				}

				override.body.push({
					textKey: row.Paragraph,
					sortIndex: row.SortIndex
				});
			});
		}

		// Fill in the gaps, do some localization work
		this.sections.forEach(s => {
			const sectionID = s.sectionID;
			const tabKey = this.findSectionTextKey(sectionID, "TAB_NAME") ?? s.nameKey
			s.tabText = Locale.compose(tabKey);
		});

		this.sections.sort((a, b) => {
			if (a.sortIndex != b.sortIndex) {
				return a.sortIndex - b.sortIndex;
			}
			else {
				return Locale.compare(a.tabText ?? '', b.tabText ?? '');
			}
		})

		this.pageGroupsBySection.forEach(groups => {
			groups.forEach(g => {
				const tabKey = this.findPageTextKey(g.sectionID, g.pageGroupID, "TAB_NAME") ?? g.nameKey;
				g.tabText = Locale.compose(tabKey);
			})

			groups.sort((a, b) => {
				if (a.sortIndex != b.sortIndex) {
					return a.sortIndex - b.sortIndex;
				}
				else {
					return Locale.compare(a.tabText ?? '', b.tabText ?? '');
				}
			});
		});

		this.pagesBySection.forEach(pages => {
			pages.forEach(page => {
				const sectionID = page.sectionID;
				const pageID = page.pageID;

				let tabText = Locale.compose(this.findPageTextKey(sectionID, pageID, "TAB_NAME") ?? page.nameKey);
				let titleText = Locale.compose(this.findPageTextKey(sectionID, pageID, "TITLE") ?? page.nameKey);
				const subtitleKey = this.findPageTextKey(sectionID, pageID, "SUBTITLE");

				if (page.pageGroupID == "UNIQUE_MILITARY_UNITS") {
					let upgradeTier = 1;
					let hasPreviousUpgrade = GameInfo.UnitUpgrades.length > 0;
					let unitType = page.pageID;

					while (hasPreviousUpgrade) {
						hasPreviousUpgrade = false;
						for (const upgrade of GameInfo.UnitUpgrades) {
							if (upgrade.UpgradeUnit == unitType) {
								unitType = upgrade.Unit;
								upgradeTier++;
								hasPreviousUpgrade = true;
								break;
							}
						};
					}

					if (upgradeTier > 1) {
						tabText = tabText + " " + Locale.compose("LOC_CIVILOPEDIA_UPGRADE_TIER", upgradeTier);
						titleText = titleText + " " + Locale.compose("LOC_CIVILOPEDIA_UPGRADE_TIER", upgradeTier);
					}
				}

				page.tabText = tabText;
				page.titleText = titleText;

				if (subtitleKey) {
					page.subTitleText = Locale.compose(subtitleKey);
				}
			});

			pages.sort((a, b) => {
				if (a.pageGroupID == b.pageGroupID) {
					if (a.sortIndex != b.sortIndex) {
						return a.sortIndex - b.sortIndex;
					}
					else {
						return Locale.compare(a.tabText ?? '', b.tabText ?? '');
					}
				}
				else {
					const groups = this.pageGroupsBySection.get(a.sectionID);
					const agIndex = groups?.findIndex((g) => g.pageGroupID == a.pageGroupID) ?? -1;
					const bgIndex = groups?.findIndex((g) => g.pageGroupID == b.pageGroupID) ?? -1;
					return agIndex - bgIndex;
				}
			})
		});

		this.chaptersByLayout.forEach(chapters => {
			chapters.sort((a, b) => {
				return a.sortIndex - b.sortIndex;
			})
		})

		this.chapterOverrides.forEach(override => {
			override.body.sort((a, b) => {
				return a.sortIndex - b.sortIndex;
			});
		});

		this.populateSearchData();
	}


	/**
	 * Indexes cached data into a search database.
	 */
	private populateSearchData() {

		// If there's already a context, destroy it so we can rebuild.
		if (Search.hasContext(CIVILOPEDIA_SEARCH_CONTEXT)) {
			Search.destroyContext(CIVILOPEDIA_SEARCH_CONTEXT);
		}

		// Create the search context.
		if (Search.createContext(CIVILOPEDIA_SEARCH_CONTEXT, "[B]", "[/B]")) {

			// Gather up all search terms by running and enumerating the database queries.
			const additionalSearchTerms = new Map<string, string[]>();
			if (GameInfo.CivilopediaPageSearchTermQueries) {
				for (const q of GameInfo.CivilopediaPageSearchTermQueries) {
					const results = Database.query('gameplay', q.SQL);
					if (results) {
						for (const searchTerm of results) {
							const key = `${searchTerm.SectionID}|${searchTerm.PageID}`;
							let lookup = additionalSearchTerms.get(key);
							if (!lookup) {
								lookup = [];
								additionalSearchTerms.set(key, lookup);
							}

							lookup.push(Locale.compose(searchTerm.Term as string));
						}
					}
				}
			}

			// Gather up all the explicit search terms.
			for (const searchTerm of GameInfo.CivilopediaPageSearchTerms) {
				const key = `${searchTerm.SectionID}|${searchTerm.PageID}`;
				let lookup = additionalSearchTerms.get(key);
				if (!lookup) {
					lookup = [];
					additionalSearchTerms.set(key, lookup);
				}

				lookup.push(Locale.compose(searchTerm.Term as string));
			}

			// Enumerate each page in each section and assign search data to it.
			Search.beginAddingData();
			for (const sectionPages of this.pagesBySection) {
				for (const page of sectionPages[1]) {
					const key = `${page.sectionID}|${page.pageID}`;
					let terms = additionalSearchTerms.get(key);
					if (!terms) {
						terms = [];
					}

					let titleText = page.titleText ?? '';
					if (page.tabText) {
						titleText = page.tabText;
						if (page.titleText) {
							terms.push(page.titleText);
						}
					}

					// Description is empty for now.  This used to be the historic context or any other large blurbs
					// associated with the page.
					// However, we found that this made the search results a bit noisy and not very reliable.
					// Still, we may need to come back to this when it comes to concepts
					const description = "";

					// This is where the magic happens.
					Search.addData(CIVILOPEDIA_SEARCH_CONTEXT, key, titleText, description, terms);
				}
			}
			Search.finishedAddingData();

			// Balance the tree now.  
			// We may want to time this method as it might take long enough to warrant it's own frame.
			Search.optimize(CIVILOPEDIA_SEARCH_CONTEXT);
		}
	}

	private onCivilopediaHotkey() {
		if (ContextManager.isCurrentClass('screen-civilopedia')) {
			ContextManager.pop('screen-civilopedia');
		} else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
			ContextManager.push("screen-civilopedia", { singleton: true, createMouseGuard: true });
		}
	}
}

export const instance = new Civilopedia();

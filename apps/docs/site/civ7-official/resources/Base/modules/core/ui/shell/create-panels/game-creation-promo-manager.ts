/**
 * @file game-creation-promo-manager.ts
 * @copyright 2025, Firaxis Games
 */

class GameCreationPromoManagerImpl {
	private promosRetrievalCompleteListener = (data: PromosDataReceivedData) => { this.updateContentPacks(data); };
	private contentPackLookup = new Map<string, string>();
	private pendingResolves: { contentType: string, resolve: (title: string | undefined) => void, reject: () => void }[] = [];

	constructor() {
		engine.on("PromosRetrievalCompleted", this.promosRetrievalCompleteListener);
	}

	public refreshPromos() {
		// Request Promos
		Online.Promo.getPromosForPlacement("2kstore");
	}

	public cancelResolves() {
		for (const pendingResolve of this.pendingResolves) {
			pendingResolve.reject();
		}

		this.pendingResolves.length = 0;
	}

	public getContentPackTitleFor(contentType: string): Promise<string | undefined> {
		if (this.contentPackLookup.size > 0) {
			const value = this.contentPackLookup.get(contentType);
			return new Promise(resolve => resolve(value));
		}

		return new Promise((resolve, reject) => this.pendingResolves.push({ contentType, resolve, reject }));
	}

	private updateContentPacks(data: PromosDataReceivedData) {
		if (data.placement != "2kstore") {
			return;
		}

		if (!data.fullRefresh) {
			return;
		}

		for (const promo of data.promos) {
			try {
				const metadata = JSON.parse(promo.metadata);
				const content = metadata.content ?? [] as string[];
				for (const contentId of content) {
					this.contentPackLookup.set(contentId, promo.localizedTitle);
				}
			} catch (ex) {
				console.error("game-creation-promo-manager: Unable to parse promo metadata - ", ex);
			}
		}

		for (const pendingResolve of this.pendingResolves) {
			const value = this.contentPackLookup.get(pendingResolve.contentType);
			pendingResolve.resolve(value);
		}

		this.pendingResolves.length = 0;
	}
}

export const GameCreationPromoManager = new GameCreationPromoManagerImpl();
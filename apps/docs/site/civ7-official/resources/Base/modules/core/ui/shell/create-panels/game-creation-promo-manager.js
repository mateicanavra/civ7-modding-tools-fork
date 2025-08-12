/**
 * @file game-creation-promo-manager.ts
 * @copyright 2025, Firaxis Games
 */
class GameCreationPromoManagerImpl {
    constructor() {
        this.promosRetrievalCompleteListener = (data) => { this.updateContentPacks(data); };
        this.contentPackLookup = new Map();
        this.pendingResolves = [];
        engine.on("PromosRetrievalCompleted", this.promosRetrievalCompleteListener);
    }
    refreshPromos() {
        // Request Promos
        Online.Promo.getPromosForPlacement("2kstore");
    }
    cancelResolves() {
        for (const pendingResolve of this.pendingResolves) {
            pendingResolve.reject();
        }
        this.pendingResolves.length = 0;
    }
    getContentPackTitleFor(contentType) {
        if (this.contentPackLookup.size > 0) {
            const value = this.contentPackLookup.get(contentType);
            return new Promise(resolve => resolve(value));
        }
        return new Promise((resolve, reject) => this.pendingResolves.push({ contentType, resolve, reject }));
    }
    updateContentPacks(data) {
        if (data.placement != "2kstore") {
            return;
        }
        if (!data.fullRefresh) {
            return;
        }
        for (const promo of data.promos) {
            try {
                const metadata = JSON.parse(promo.metadata);
                const content = metadata.content ?? [];
                for (const contentId of content) {
                    this.contentPackLookup.set(contentId, promo.localizedTitle);
                }
            }
            catch (ex) {
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

//# sourceMappingURL=file:///core/ui/shell/create-panels/game-creation-promo-manager.js.map

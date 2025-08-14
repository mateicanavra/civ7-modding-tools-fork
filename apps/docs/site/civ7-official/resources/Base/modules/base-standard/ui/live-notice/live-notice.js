/**
 * @file live-notice.ts
 * @copyright 2024, Firaxis Games
 * @description LiveOps message panel
 */
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
export var LiveNoticeType;
(function (LiveNoticeType) {
    LiveNoticeType[LiveNoticeType["ChallengeCompleted"] = 0] = "ChallengeCompleted";
    LiveNoticeType[LiveNoticeType["LegendPathsUpdate"] = 1] = "LegendPathsUpdate";
    LiveNoticeType[LiveNoticeType["RewardReceived"] = 2] = "RewardReceived";
})(LiveNoticeType || (LiveNoticeType = {}));
const STARTING_INNER_HTML = `
<div class="live-notice-container-background">
	<div class="live-notice-main-container -mt-2">
		<fxs-hslot class="live-notice-main-hslot font-body text-base text-accent-2">
			<fxs-vslot class="live-notice-title-bar">
				<div class="live-notice-title font-title uppercase text-base text-secondary-1 text-right" data-l10n-id="LOC_CHALLENGE_COMPLETE"></div>
				<div class="live-notice-challenge-name font-body text-base text-primary-1 text-right"></div>
			</fxs-vslot>
			<fxs-hslot class="live-notice-main-info">
				<div class="live-notice-challenge-score font-body text-primary-1 text-center self-center"></div>
				<div class="live-notice-check pointer-events-auto bg-contain bg-center bg-no-repeat mr-2"></div>
				<div class="live-notice-filigree-right"></div>
			</fxs-hslot>
		</fxs-hslot>
	</div>
</div>`;
class LiveNoticePanel extends Component {
    constructor() {
        super(...arguments);
        this.isBusy = false;
        this.container = null;
        this.animationEndListener = this.onAnimationEnd.bind(this);
        this.updateRewardsListener = this.onUpdateRewards.bind(this);
        this.noticeQueue = [];
        this.ChallengeCompletedListener = (data) => { this.resolveChallengeCompleted(data); };
        this.LegendPathUpdatedListener = (data) => { this.resolveLegendPathUpdated(data); };
        this.RewardReceivedListener = (data) => { this.resolveRewardReceivedListener(data); };
        this.runNotice = async () => {
            // Wait 5 seconds
            await new Promise(f => setTimeout(f, 5000));
            // Now animate out.  The end-of-animation handler will clear the busy flag.
            this.animateOut();
        };
    }
    onAttach() {
        super.onAttach();
        engine.on('ChallengeCompleted', this.ChallengeCompletedListener);
        engine.on('LegendPathsDataUpdated', this.LegendPathUpdatedListener, this);
        this.Root.classList.add("absolute", "right-0");
        this.Root.innerHTML = STARTING_INNER_HTML;
        this.container = MustGetElement(".live-notice-container-background", this.Root);
        this.container?.addEventListener("animationend", this.animationEndListener);
        // For giftbox notifications, right now have 2 paths coming in - 
        // on first startup where we get the update-live-notice refresh event, and on manual entitlements updated event from engine
        // TODO: Revisit this when DNA push notifications are integrated, likely can integrate into and listen to just one event
        engine.on('EntitlementsUpdated', this.RewardReceivedListener);
        window.addEventListener("update-live-notice", this.updateRewardsListener);
        this.container?.classList.add("live-notice-off-screen");
    }
    onDetach() {
        super.onDetach();
        this.container?.removeEventListener("animationend", this.animationEndListener);
    }
    showNotice(notice) {
        if (this.isBusy) {
            this.noticeQueue.push(notice);
            return;
        }
        this.isBusy = true;
        const title = MustGetElement(".live-notice-title", this.Root);
        const name = MustGetElement(".live-notice-challenge-name", this.Root);
        const score = MustGetElement(".live-notice-challenge-score", this.Root);
        if (notice.liveNoticeType == LiveNoticeType.RewardReceived) {
            title.setAttribute("data-l10n-id", "LOC_REWARD_RECEIVED");
            name.innerHTML = Locale.compose(notice.title);
            score.innerHTML = Locale.compose(notice.description);
            score.classList.add("text-xs", "uppercase");
        }
        else if (notice.liveNoticeType == LiveNoticeType.ChallengeCompleted) {
            title.setAttribute("data-l10n-id", "LOC_CHALLENGE_COMPLETE");
            name.innerHTML = Locale.compose(notice.title);
            score.innerHTML = Locale.compose("LOC_METAPROGRESSION_XP", notice.score);
            score.classList.add("text-base");
        }
        else if (notice.liveNoticeType == LiveNoticeType.LegendPathsUpdate) {
            title.setAttribute("data-l10n-id", Locale.compose("LOC_LEVEL_ACHIEVE", notice.score));
            // foundation path
            if (notice.title.includes("FOUNDATION")) {
                name.innerHTML = Locale.compose("LOC_METAPROGRESSION_PATH_FOUNDATION");
            }
            // leader path
            else {
                name.innerHTML = Locale.compose(notice.title.replace("LEGEND_PATH", "LOC_LEADER") + "_NAME");
            }
            score.innerHTML = " ";
            score.classList.add("text-base");
        }
        this.animateIn();
        this.runNotice();
    }
    animateIn() {
        this.container?.classList.remove("live-notice-off-screen");
        this.container?.classList.remove("live-notice-animate-out");
        this.container?.classList.add("live-notice-animate-in");
    }
    animateOut() {
        this.container?.classList.remove("live-notice-animate-in");
        this.container?.classList.add("live-notice-animate-out");
    }
    onAnimationEnd(event) {
        if (event.animationName == "live-notice-animate-out") {
            this.container?.classList.add("live-notice-off-screen");
            this.isBusy = false;
            if (this.noticeQueue.length > 0) {
                // Get the first item pushed onto the queue.
                const queuedNotice = this.noticeQueue[0];
                // Now remove it from the queue.
                this.noticeQueue.splice(0, 1);
                if (queuedNotice) {
                    this.showNotice(queuedNotice);
                }
            }
        }
    }
    resolveRewardReceivedListener(data) {
        this.onUpdateRewards();
        console.log(`Nofifying about ${data.keys.length} New Rewards!`);
    }
    onUpdateRewards() {
        const allRewards = Online.UserProfile.getRewardEntries();
        const newItems = Online.UserProfile.getNewlyUnlockedItems();
        if (newItems.length > 0) {
            newItems.forEach(dnaItemID => {
                const item = allRewards.find((r) => r.dnaItemID === dnaItemID);
                if (item) {
                    const liveNoticeObj = {
                        title: item.name,
                        score: 0,
                        description: item.description,
                        liveNoticeType: LiveNoticeType.RewardReceived
                    };
                    this.showNotice(liveNoticeObj);
                }
            });
        }
        console.log(`Received ${newItems.length} New Rewards!`);
    }
    resolveChallengeCompleted(data) {
        if (data.hidden)
            return; // don't need notifications for hidden challenges, typically used for multi-challenge challenges
        const liveNoticeObj = {
            title: data.name,
            score: data.rewardXp,
            description: data.description,
            liveNoticeType: LiveNoticeType.ChallengeCompleted
        };
        this.showNotice(liveNoticeObj);
    }
    resolveLegendPathUpdated(data) {
        if (data.status == 0) // don't show on every legend path XP gain, just level up
            return;
        const liveNoticeObj = {
            title: data.legendPathType,
            score: data.newLevel,
            description: "",
            liveNoticeType: LiveNoticeType.LegendPathsUpdate
        };
        this.showNotice(liveNoticeObj);
    }
}
Controls.define("live-notice-panel", {
    createInstance: LiveNoticePanel,
    classNames: ['live-notice-panel', 'pointer-events-none'],
    description: 'Panel for displaying real-time notices',
    styles: ['fs://game/base-standard/ui/live-notice/live-notice.css']
});

//# sourceMappingURL=file:///base-standard/ui/live-notice/live-notice.js.map

/**
 * @file live-notice.ts
 * @copyright 2024, Firaxis Games
 * @description LiveOps message panel
 */

import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

export enum LiveNoticeType {
	ChallengeCompleted,
	LegendPathsUpdate,
	RewardReceived
}

interface LiveNotice {
	title: string;
	score: number;
	description: string;
	liveNoticeType: LiveNoticeType;
}

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
	private isBusy: boolean = false;
	private container: HTMLElement | null = null;
	private animationEndListener = this.onAnimationEnd.bind(this);
	private updateRewardsListener = this.onUpdateRewards.bind(this);
	private noticeQueue: LiveNotice[] = [];
	private ChallengeCompletedListener = (data: ChallengeCompletedData) => { this.resolveChallengeCompleted(data); };
	private LegendPathUpdatedListener = (data: LegendPathsUpdateData) => { this.resolveLegendPathUpdated(data); };
	private RewardReceivedListener = (data: EntitlementsUpdatedData) => { this.resolveRewardReceivedListener(data); };

	onAttach(): void {
		super.onAttach();

		engine.on('ChallengeCompleted', this.ChallengeCompletedListener);
		engine.on('LegendPathsDataUpdated', this.LegendPathUpdatedListener, this);

		this.Root.classList.add("absolute", "right-0");
		this.Root.innerHTML = STARTING_INNER_HTML;

		this.container = MustGetElement<HTMLElement>(".live-notice-container-background", this.Root);
		this.container?.addEventListener("animationend", this.animationEndListener);

		// For giftbox notifications, right now have 2 paths coming in - 
		// on first startup where we get the update-live-notice refresh event, and on manual entitlements updated event from engine
		// TODO: Revisit this when DNA push notifications are integrated, likely can integrate into and listen to just one event
		engine.on('EntitlementsUpdated', this.RewardReceivedListener);
		window.addEventListener("update-live-notice", this.updateRewardsListener);

		this.container?.classList.add("live-notice-off-screen");
	}

	onDetach(): void {
		super.onDetach();

		this.container?.removeEventListener("animationend", this.animationEndListener);
	}

	private showNotice(notice: LiveNotice): void {
		if (this.isBusy) {
			this.noticeQueue.push(notice);
			return;
		}

		this.isBusy = true;

		const title: HTMLElement = MustGetElement(".live-notice-title", this.Root);
		const name: HTMLElement = MustGetElement(".live-notice-challenge-name", this.Root);
		const score: HTMLElement = MustGetElement(".live-notice-challenge-score", this.Root);

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

	private runNotice = async () => {
		// Wait 5 seconds
		await new Promise(f => setTimeout(f, 5000));

		// Now animate out.  The end-of-animation handler will clear the busy flag.
		this.animateOut();
	}

	private animateIn() {
		this.container?.classList.remove("live-notice-off-screen");
		this.container?.classList.remove("live-notice-animate-out");
		this.container?.classList.add("live-notice-animate-in");
	}

	private animateOut() {
		this.container?.classList.remove("live-notice-animate-in");
		this.container?.classList.add("live-notice-animate-out");
	}

	private onAnimationEnd(event: AnimationEvent) {
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

	private resolveRewardReceivedListener(data: EntitlementsUpdatedData) {
		this.onUpdateRewards();

		console.log(`Nofifying about ${data.keys.length} New Rewards!`)
	}

	private onUpdateRewards() {
		const allRewards = Online.UserProfile.getRewardEntries();
		const newItems = Online.UserProfile.getNewlyUnlockedItems();

		if (newItems.length > 0) {
			newItems.forEach(dnaItemID => {
				const item = allRewards.find((r) => r.dnaItemID === dnaItemID);
				if (item) {
					const liveNoticeObj: LiveNotice = {
						title: item.name,
						score: 0,
						description: item.description, //TODO: plans to do an icon for the reward type instead
						liveNoticeType: LiveNoticeType.RewardReceived
					};

					this.showNotice(liveNoticeObj);
				}
			})
		}

		console.log(`Received ${newItems.length} New Rewards!`)
	}

	private resolveChallengeCompleted(data: ChallengeCompletedData) {
		if (data.hidden) return; // don't need notifications for hidden challenges, typically used for multi-challenge challenges

		const liveNoticeObj: LiveNotice = {
			title: data.name,
			score: data.rewardXp,
			description: data.description,
			liveNoticeType: LiveNoticeType.ChallengeCompleted
		};

		this.showNotice(liveNoticeObj);
	}

	private resolveLegendPathUpdated(data: LegendPathsUpdateData) {
		if (data.status == 0) // don't show on every legend path XP gain, just level up
			return;

		const liveNoticeObj: LiveNotice = {
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
})

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js'

type RelationshipItem = {
	eventType: DiplomacyFavorGrievanceEventType,
	amount: number;
}

export class RelationshipBreakdown {
	public readonly root = document.createElement("div");
	private readonly sectionLineAbove = document.createElement('div');
	private readonly sectionLineBelow = document.createElement('div');
	private readonly relationshipItemsContainer = document.createElement("div");
	private readonly relationshipIcon = document.createElement("fxs-icon");
	private readonly relationshipName = document.createElement("div");
	private readonly relationshipAmount = document.createElement("div");

	constructor(playerA: PlayerId, playerB = GameContext.localPlayerID) {
		const relationshipHeader = document.createElement("div");
		relationshipHeader.classList.add("flex", "flex-col", "items-center", "justify-center", "w-full");

		const relationshipTitle = document.createElement("fxs-header");
		relationshipTitle.classList.add("mb-1");
		relationshipTitle.setAttribute('title', 'LOC_INDEPENDENT_RELATIONSHIP');
		relationshipTitle.setAttribute('filigree-style', 'h4');
		relationshipHeader.append(relationshipTitle);


		const relationshipInfo = document.createElement("div");
		relationshipInfo.classList.add("flex", "items-center");

		this.relationshipIcon.classList.add("size-8");
		this.relationshipIcon.setAttribute("data-icon-context", "PLAYER_RELATIONSHIP");


		relationshipInfo.append(this.relationshipIcon);

		this.relationshipName.classList.add("mx-2");
		relationshipInfo.append(this.relationshipName);

		this.relationshipAmount.classList.add("mr-2");


		relationshipInfo.append(this.relationshipAmount);
		relationshipHeader.append(relationshipInfo);
		this.relationshipItemsContainer.classList.add('flex', 'flex-col', 'px-2');

		this.sectionLineAbove.classList.add("hidden", "mt-2", "filigree-inner-frame-top-gold");
		this.sectionLineBelow.classList.add("hidden", "filigree-inner-frame-bottom-gold");

		this.root.append(
			relationshipHeader,
			this.sectionLineAbove,
			this.relationshipItemsContainer,
			this.sectionLineBelow
		);

		this.update(playerA, playerB);
	}

	public update(playerA: PlayerId, playerB = GameContext.localPlayerID) {
		const playerDiplomacy = Players.Diplomacy.get(playerA);
		if (!playerDiplomacy) {
			console.error("relationship-breakdown: Unable to get player diplomacy", playerA);
			return;
		}
		const relationship = playerDiplomacy.getRelationshipEnum(playerB);


		this.relationshipName.innerHTML = Locale.stylize(playerDiplomacy.getRelationshipLevelName(playerB));

		this.relationshipIcon.setAttribute("data-icon-id", DiplomacyManager.getRelationshipTypeString(relationship));
		const relationshipAmountValue: number = playerDiplomacy.getRelationshipLevel(playerB);

		let relationshipAmountString: string = relationshipAmountValue.toString();
		if (relationshipAmountValue > 0) {
			relationshipAmountString = "+" + relationshipAmountString;
		}
		this.relationshipAmount.classList.toggle("text-positive", relationshipAmountValue > 0);
		this.relationshipAmount.classList.toggle("text-negative", relationshipAmountValue < 0);
		this.relationshipAmount.innerHTML = relationshipAmountString;

		const items: RelationshipItem[] = [];
		const relationshipHistory = playerDiplomacy.getPlayerRelationshipHistory(playerB);
		relationshipHistory?.forEach((relationshipEvent) => {
			const itemIndex = items.findIndex(item => relationshipEvent.eventType == item.eventType);
			if (itemIndex != -1) {
				items[itemIndex].amount += relationshipEvent.amount;
			} else {
				items.push({ eventType: relationshipEvent.eventType, amount: relationshipEvent.amount });
			}
		});


		this.relationshipItemsContainer.innerHTML = "";
		for (let i = 0; i < items.length; i++) {
			const item = items[i];

			const relationshipEventLine = document.createElement("div");
			relationshipEventLine.classList.add('flex', 'justify-between', 'p-1');

			const relationshipEventText = document.createElement("div");
			relationshipEventText.classList.add("flex-1", "pr-4");
			if (i % 2 == 0) {
				relationshipEventLine.classList.add("bg-primary-3");
			} else {
				relationshipEventText.classList.add("text-accent-1");
			}

			relationshipEventText.innerHTML = Locale.stylize(playerDiplomacy.getFavorGrievanceEventTypeName(item.eventType));
			relationshipEventLine.append(relationshipEventText)

			const relationshipEventAmount = document.createElement("div");
			relationshipEventAmount.classList.add("font-bold");
			if (item.amount > 0) {
				relationshipEventAmount.classList.add("text-positive");
				relationshipEventAmount.innerHTML = "+" + (Math.floor(item.amount * 10) / 10).toString();
			} else {
				relationshipEventAmount.classList.add("text-negative");
				relationshipEventAmount.innerHTML = (Math.floor(item.amount * 10) / 10).toString();
			}
			relationshipEventLine.append(relationshipEventAmount);

			this.relationshipItemsContainer.append(relationshipEventLine);
		}

		this.sectionLineAbove.classList.toggle('hidden', items.length === 0);
		this.sectionLineBelow.classList.toggle('hidden', items.length === 0);
	}
}
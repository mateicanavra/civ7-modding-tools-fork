/**
 * @file model-unit-promotions.ts
 * @copyright 2023, Firaxis Games
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { Graph, Label } from '/core/ui/graph-layout/graph.js';
import { GraphLayout } from '/core/ui/graph-layout/layout.js';
import { utils } from '/core/ui/graph-layout/utils.js';
import ViewManager from '/core/ui/views/view-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

export type PromotionCard = {
	discipline: UnitPromotionDisciplineDefinition,
	iconClass: string,
	promotion: UnitPromotionDefinition,
	row: number;
	column: number;
	hasData: boolean;
}

export type TreeLayoutData = {
	rows: number;
	columns: number;
	layoutHeight: number;
	layoutWidth: number;
}

export type PromotionTree = {
	discipline: UnitPromotionDisciplineDefinition;
	promotions: UnitPromotionDefinition[];
	cards: PromotionCard[];
	layoutGraph: Graph;
	layoutData: TreeLayoutData;
}

interface ClassMap {
	[key: string]: string
}

class UnitPromotionModel {
	private _isClosing: boolean = false;
	get isClosing(): boolean {
		return this._isClosing;
	}
	set isClosing(value: boolean) {
		this._isClosing = value;
	}
	private selectedUnit: Unit | null = null;
	// Model Data
	private _name: string = "";
	private _totalPromotions: number = 0;
	private _experienceMax: number = 0;
	private _experienceCurrent: number = 0;
	private _experienceCaption: string = "";
	private _promotionPoints: number = 0;
	private _commendationPoints: number = 0;
	private _level: number = 0;
	private _promotionsLabel: string = "";
	private _commendationsLabel: string = "";
	private _commendations: UnitPromotionDefinition[] = [];

	private iconClassMap: ClassMap = {
		"LOC_DISCIPLINE_ARMY_BASTION_NAME": "promotion-bastion",
		"LOC_DISCIPLINE_ARMY_ASSAULT_NAME": "promotion-assault",
		"LOC_DISCIPLINE_LOGISTICS_NAME": "promotion-logistics",
		"LOC_DISCIPLINE_MANEUVER_NAME": "promotion-maneuver",
		"LOC_DISCIPLINE_LEADERSHIP_NAME": "promotion-leadership",
		"LOC_DISCIPLINE_FLEET_BOMBARDMENT_NAME": "promotion-bombardment",
		"LOC_DISCIPLINE_FLEET_ENGAGEMENT_NAME": "promotion-engagement",
		"LOC_DISCIPLINE_SQUADRON_DOGFIGHTING_NAME": "promotion-dogfighting",
		"LOC_DISCIPLINE_SQUADRON_RAIDS_NAME": "promotion-raids",
		"LOC_DISCIPLINE_AIRLIFT_OPERATIONS_NAME": "promotion-airlift-operations",
		"LOC_DISCIPLINE_CARRIER_OPERATIONS_NAME": "promotion-carrier-operations",
		"LOC_DISCIPLINE_ARMY_TRUNG_NHI_NAME": "promotion-trung-nhi"
	}

	private _OnUpdate?: (model: UnitPromotionModel) => void;
	public updateGate: UpdateGate = new UpdateGate(() => { this.update(); });

	private promotionsByDiscipline: Map<UnitPromotionDisciplineDefinition, UnitPromotionDefinition[]> = new Map<UnitPromotionDisciplineDefinition, UnitPromotionDefinition[]>();
	private _promotionTrees: PromotionTree[] = [];

	private readonly ORIGIN_ROW: number = 1;
	private readonly ORIGIN_COLUMN: number = 1;
	private readonly HORIZONTAL_OFFSET: number = 2;
	private readonly VERTICAL_OFFSET: number = 2;

	constructor() {
		engine.whenReady.then(() => {
			this.updateGate.call('init');
			engine.on('UnitSelectionChanged', this.onUnitSelectionChanged, this);
		});
	}

	set updateCallback(callback: (model: UnitPromotionModel) => void) {
		this._OnUpdate = callback;
	}

	get name(): string { return this._name; }
	get totalPromotions(): number { return this._totalPromotions; }
	get experienceCaption(): string { return this._experienceCaption; }
	get experienceMax(): number { return this._experienceMax; }
	get experienceCurrent(): number { return this._experienceCurrent; }
	get promotionPoints(): number { return this._promotionPoints; }
	get commendationPoints(): number { return this._commendationPoints; }
	get level(): number { return this._level; }
	get promotionsLabel(): string { return this._promotionsLabel; }
	get commendationsLabel(): string { return this._commendationsLabel; }
	get commendations(): UnitPromotionDefinition[] { return this._commendations; }
	get promotionTrees(): PromotionTree[] { return this._promotionTrees; }
	get canPurchase(): boolean { return this._promotionPoints > 0 || this._commendationPoints > 0 }

	private onUnitSelectionChanged(event: UnitSelectionChangedData) {
		if (!ViewManager.isUnitSelectingAllowed) {
			return;
		}

		if (event.unit.owner == GameContext.localPlayerID && event.selected) {
			const unitComponentID: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (!ComponentID.isValid(unitComponentID)) {
				console.warn("model-unit-promotion: onUnitSelectionChanged: Unit selected message signaled but no head selected unit!");
				return;
			}

			if (ComponentID.isMatch(unitComponentID, event.unit)) {
				const unit: Unit | null = Units.get(event.unit);
				if (unit && unit.isCommanderUnit) {
					this.update();
				}
			}
		}
	}

	private update() {
		const selectedUnitID: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (!selectedUnitID) {
			console.error(`model-unit-promotion: Update unable to retrieve selected unit it. triggers: ${this.updateGate.callTriggers}`);
			return;
		}

		const unit: Unit | null = Units.get(selectedUnitID);
		if (!unit) {
			console.error("model-unit-promotion: update(): No existing unit with id: " + selectedUnitID);
			return;
		}

		this.selectedUnit = unit;
		this._name = Locale.compose(this.selectedUnit.name);

		if (!this.selectedUnit.Experience) {
			console.error("model-unit-promotion: update(): No valid unit Experience component attached to unit with id:" + this.selectedUnit.id);
			return;
		}

		const promotionsSize: number = this.selectedUnit.Experience.getTotalPromotionsEarned;
		this._totalPromotions = promotionsSize;

		const currentExperience: number = this.selectedUnit.Experience.experiencePoints;
		const experienceToNextLevel: number = this.selectedUnit.Experience.experienceToNextLevel;

		this._experienceMax = experienceToNextLevel;
		this._experienceCurrent = currentExperience;
		this._experienceCaption = `${currentExperience} / ${experienceToNextLevel}`;
		this._promotionPoints = this.selectedUnit.Experience.getStoredPromotionPoints;
		this._level = this.selectedUnit.Experience.getLevel;
		this._commendationPoints = this.selectedUnit.Experience.getStoredCommendations;

		this._promotionsLabel = Locale.compose("LOC_PROMOTION_POINTS", this.selectedUnit.Experience.getStoredPromotionPoints);
		this._commendationsLabel = Locale.compose("LOC_PROMOTION_COMMENDATION_POINTS", this.selectedUnit.Experience.getStoredCommendations);

		this.realizePromotionTreeElements();

		if (this._OnUpdate) {
			this._OnUpdate(this);
		}
	}

	updateModel() {
		this.update();
	}

	private realizePromotionTreeElements() {
		if (!this.selectedUnit) {
			console.error("model-unit-promotion: realizePromotionTreeElements(): No valid unit selected");
			return;
		}
		if (!this.selectedUnit.Experience) {
			console.error("model-unit-promotion: realizePromotionTreeElements(): No valid unit Experience component attached to unit with id:" + this.selectedUnit.id);
			return;
		}

		this._promotionTrees = [];
		this.promotionsByDiscipline.clear();

		const promotionClass: UnitDefinition | null = GameInfo.Units.lookup(this.selectedUnit.type);

		if (!promotionClass) {
			console.error("model-unit-promotion: realizePromotionTreeElements(): No valid promotionClass attached to unit with id:" + this.selectedUnit.id);
			return;
		}

		GameInfo.UnitPromotionClassSets.forEach(classSet => {
			if (classSet.PromotionClassType === promotionClass.PromotionClass) {
				const discipline = GameInfo.UnitPromotionDisciplines.lookup(classSet.UnitPromotionDisciplineType);
				const details = GameInfo.UnitPromotionDisciplineDetails.filter(p => p.UnitPromotionDisciplineType === classSet.UnitPromotionDisciplineType);
				let addedPromos: string[] = [];
				details.forEach(detail => {
					const promotion = GameInfo.UnitPromotions.lookup(detail.UnitPromotionType);
					if (promotion != undefined && discipline != undefined && !promotion.Commendation) {
						const promotionByDiscipline: UnitPromotionDefinition[] | undefined = this.promotionsByDiscipline.get(discipline);
						if (promotionByDiscipline == undefined) {
							this.promotionsByDiscipline.set(discipline, [promotion]);
						}

						let hasPromo: boolean = false;
						for (let i = 0; i < addedPromos.length; ++i) {
							if (addedPromos[i] === promotion.UnitPromotionType) {
								hasPromo = true;
								break;
							}
						}

						if (!hasPromo) {
							promotionByDiscipline?.push(promotion);
							addedPromos?.push(promotion.UnitPromotionType);
						}
					}
				});
			}
		});

		this.promotionsByDiscipline.forEach((promotions, discipline) => {
			const promotionGraph: Graph = this.buildPromotionsLayoutGraph(promotions, discipline);

			const layoutHeight: number = utils.maxRank(promotionGraph) + 1; // index starting at 1
			const layoutWidth: number = utils.maxOrder(promotionGraph) + 1;

			const totalRows: number = (layoutHeight * this.HORIZONTAL_OFFSET) + this.ORIGIN_ROW;
			const totalColumns: number = (layoutWidth * this.VERTICAL_OFFSET) + this.ORIGIN_COLUMN;

			const promotionTree: PromotionTree = {
				discipline: discipline,
				promotions: promotions,
				layoutGraph: promotionGraph,
				cards: [],
				layoutData: {
					rows: totalRows,
					columns: totalColumns,
					layoutHeight: layoutHeight,
					layoutWidth: layoutWidth
				}
			};

			const iconClassByDisciplineName: string = this.getIconClassByDisciplineName(discipline.Name);
			promotions.forEach(promotion => {
				const card: PromotionCard = {
					discipline: discipline,
					iconClass: iconClassByDisciplineName,
					promotion: promotion,
					row: -1,
					column: -1,
					hasData: false,
				}

				promotionTree.cards.push(card);
			});

			this._promotionTrees.push(promotionTree);
		});

		this.buildPromotionCards();
	}

	private getIconClassByDisciplineName(name: string): string {
		return this.iconClassMap[name];
	}

	private buildPromotionsLayoutGraph(promotions: UnitPromotionDefinition[], discipline: UnitPromotionDisciplineDefinition): Graph {
		const graph: Graph = new Graph();
		graph.setGraph({});
		graph.setDefaultEdgeLabel(function () { return {}; });

		for (let i: number = 0; i < promotions.length; i++) {
			const promotion: UnitPromotionDefinition = promotions[i];
			const unitPromotionsPrereq: UnitPromotionDisciplineDetailDefinition[] = GameInfo.UnitPromotionDisciplineDetails.filter(p =>
				(p.UnitPromotionType === promotion.UnitPromotionType) && (p.UnitPromotionDisciplineType === discipline.UnitPromotionDisciplineType));
			unitPromotionsPrereq.forEach(promotionPrereq => {
				if (promotionPrereq.PrereqUnitPromotion) {
					const startNode: string = promotionPrereq.PrereqUnitPromotion;
					const endNode: string = promotionPrereq.UnitPromotionType;

					graph.setNode(startNode, { label: startNode })
					graph.setNode(endNode, { label: endNode });
					graph.setEdge(startNode, endNode);
				}
			});
		}

		const layout: GraphLayout = new GraphLayout(graph);
		const layoutGraph: Graph = layout.autoResolve();

		return layoutGraph;
	}

	private buildPromotionCards() {
		this.promotionTrees.forEach(promotionTree => {
			const graphLayout: Graph = promotionTree.layoutGraph;
			const layerOffsets: number[] = this.getHorizontalOffsets(graphLayout);

			// sort by rank to make sure we traverse from left to right (for the sink and dummy alignment)
			const orderedCards: PromotionCard[] = promotionTree.cards.sort((cardA, cardB) => {
				const nodeA: Label = graphLayout.node(cardA.promotion.UnitPromotionType);
				const nodeB: Label = graphLayout.node(cardB.promotion.UnitPromotionType);
				return nodeA.rank - nodeB.rank;
			});

			promotionTree.cards = orderedCards;

			promotionTree.cards.forEach(dataCard => {
				const nodeId: string = dataCard.promotion?.UnitPromotionType;
				const node: Label = graphLayout.node(nodeId);
				if (node) {
					const horizontalOffset: number = layerOffsets[node.rank];

					if (dataCard.row == -1) {
						dataCard.row = this.ORIGIN_ROW + node.rank * this.HORIZONTAL_OFFSET;
					}

					if (dataCard.column == -1) {
						dataCard.column = this.ORIGIN_COLUMN + node.order * this.VERTICAL_OFFSET + horizontalOffset;
					}

					dataCard.hasData = true;
				}
			});
		})
	}

	private getHorizontalOffsets(graph: Graph): number[] {
		const maxRank: number = utils.maxRank(graph);
		const maxOrder: number = utils.maxOrder(graph);
		const layers: Object[][] = utils.range(0, maxRank + 1).map<string[]>(function () { return []; });

		graph.nodes().forEach(v => {
			const node: Label = graph.node(v);
			const rank: number = node.rank;
			const order: number = node.order;

			const layerNode: Object = { v, order, rank };

			if (node) {
				layers[rank].push(layerNode);
			}
		});

		const maxHeigth: number = maxOrder + 1;
		const layerOffsets: number[] = [];
		layers.forEach(layer => {
			const layerOffset: number = maxHeigth - layer.length;
			layerOffsets.push(layerOffset);
		})

		return layerOffsets;
	}

	getCard(type: string | undefined): PromotionCard | undefined {
		if (type == undefined) {
			return undefined;
		}

		for (let iTree: number = 0; iTree < this.promotionTrees.length; iTree++) {
			const targetTree: PromotionTree = this.promotionTrees[iTree];

			const targetCard: PromotionCard | undefined = targetTree.cards.find(t => t.promotion.UnitPromotionType == type);
			if (targetCard != undefined) {
				return targetCard;
			}
		}
		//Else we never found a type match:
		return (undefined);
	}

	getLastPopulatedRowFromTree(tree: HTMLElement): NodeListOf<HTMLElement> | undefined {
		const treeDiscipline: string | null = tree.getAttribute('promotion-discipline');

		if (!treeDiscipline) {
			console.error("model-unit-promotion: getLastPopulatedRowFromTree(): No discipline attribute found");
			return;
		}

		const treeInfo: PromotionTree | undefined = this.promotionTrees.find(tree => tree.discipline.UnitPromotionDisciplineType == treeDiscipline);

		if (!treeInfo) {
			console.error("model-unit-promotion: getLastPopulatedRowFromTree(): No tree with discipline " + treeDiscipline);
			return;
		}

		const treeGraph: Graph = treeInfo.layoutGraph;
		const maxRank: number = utils.maxRank(treeGraph);
		const lastRowIndex = this.ORIGIN_ROW + maxRank * this.HORIZONTAL_OFFSET;

		const lastRowCards: NodeListOf<HTMLElement> = tree.querySelectorAll<HTMLElement>(`div[row="${lastRowIndex}"] .promotion-element`);
		return lastRowCards;
	}
}

const UnitPromotion: UnitPromotionModel = new UnitPromotionModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(UnitPromotion);
	}

	engine.createJSModel('g_UnitPromotion', UnitPromotion);
	UnitPromotion.updateCallback = updateModel;
});

export { UnitPromotion as default };
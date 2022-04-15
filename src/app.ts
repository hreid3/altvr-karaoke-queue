/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from "@microsoft/mixed-reality-extension-sdk";
import {BoxAlignment} from "@microsoft/mixed-reality-extension-sdk";
import block from "./block";

type Participant = MRE.User;
type Participants = Participant[];
export const playButtonLabel = "label";
const cardCellItemOptions = {
	height: 0.15,
	column: 0,
	width: .6
};

/**
 * The main class of this Index. All the logic goes here.
 */
export default class App {
	private appRoot: MRE.Actor;
	private assets: MRE.AssetContainer;
	private soundAssets: Record<string, MRE.Sound>;
	private appStarted = false;
	private participants: Participants =[];
	private root: MRE.Actor;
	private removeMeButtonMaterial: MRE.Material;
	private joinButtonMaterial: MRE.Material;
	private buttonMesh: MRE.Mesh;
	private joinButton: MRE.Actor;
	private removeMeButton: MRE.Actor;
	private ignoreClicks = false;
	private participantsGrid: MRE.PlanarGridLayout;
	private participantsBase: MRE.Actor;
	private initialized = false;

	constructor(private context: MRE.Context, private parameterSet: MRE.ParameterSet) {
		console.log("constructed", this.context.sessionId);
		this.assets = new MRE.AssetContainer(context);
		this.context.onStarted(this.started);
		this.context.onStopped(this.stopped);
		this.context.onUserLeft(this.handleUserLeft);
		this.context.onUserJoined(this.handleUserJoined);
	}

	private handleUserJoined = async (user: MRE.User) => {
		if (!this.initialized) {
			await block(() => this.initialized, 15000);
		}
		this.attachBehaviors();
	};

	private handleUserLeft = (user: MRE.User) => {
		this.removeParticipant(user);
	};

	private started = () => {
		this.removeMeButtonMaterial = this.assets.createMaterial("removeMeButtonMat", {color: MRE.Color3.Red()});
		this.joinButtonMaterial = this.assets.createMaterial("playButtonMat", {color: MRE.Color3.Green()});
		this.buttonMesh = this.assets.createBoxMesh("playButtonMesh", 0.4, 0.095, 0.01);
		console.log("App Started");
		this.root = MRE.Actor.Create(this.context, {
			actor: {
				name: `3d-bigscreen-Root`,
				transform: {
					local: {
						scale: {x: 1, y: 1, z: 1}
					}
				}
			}
		});
		this.setupView();
		this.initialized = true;
	};

	getButton = (base: MRE.Actor, buttonName: string, material: MRE.Material, labelText: string) => {
		const playButtonBox = this.buttonMesh;
		const playButton = MRE.Actor.Create(this.context,
			{
				actor: {
					name: buttonName,
					parentId: base.id,
					appearance: {
						meshId: playButtonBox.id,
						materialId: material.id,
						enabled: true
					},
					transform: {
						local: {
							// position: {x: -.060, y: -0.033, z: 0.0015},
							// rotation: base.transform.local.rotation,
							scale: {x: 1, y: 1, z: 1}
						}
					},
					collider: {
						geometry: {
							shape: MRE.ColliderType.Auto
						},
						isTrigger: true
					}
				}
			}
		);
		MRE.Actor.Create(this.context, {
			actor: {
				name: playButtonLabel,
				parentId: playButton.id,
				transform: {
					local: {
						position: {z: 0.01, y: 0},
						rotation: MRE.Quaternion.FromEulerAngles(0, -Math.PI, 0),
					}
				},
				text: {
					contents: labelText,
					pixelsPerLine: 12,
					height: 0.038,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
				}
			}
		});
		return playButton
	}
	private stopped = () => {
		console.log("App Stopped");
	};

	private setupView = () => {
		const buttonBase = MRE.Actor.Create(this.context, {
			actor: {
				name: `karaoke-button-base`,
				transform: {
					local: {
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});
		const grid = new MRE.PlanarGridLayout(buttonBase);
		this.joinButton = this.getButton(buttonBase, 'join', this.joinButtonMaterial, "JOIN ME");
		this.removeMeButton = this.getButton(buttonBase, 'remove-me', this.removeMeButtonMaterial, "REMOVE ME");

		grid.addCell({
			column: 0, height: .6, row: 0, width: .6,
			contents: this.joinButton
		})
		grid.addCell({
			column: 1, height: .6, row: 0, width: .6,
			contents: this.removeMeButton
		})

		grid.applyLayout()

		this.participantsBase = MRE.Actor.Create(this.context, {
			actor: {
				name: `karaoke-participants-base`,
				transform: {
					local: {
						scale: {x: 1, y: 1, z: 1},
						rotation: MRE.Quaternion.FromEulerAngles(0, -Math.PI, 0),
						position: {x: .4, y: -.05}
					}
				}
			}
		});
		this.participantsGrid = new MRE.PlanarGridLayout(this.participantsBase, BoxAlignment.BottomLeft);
		this.attachBehaviors();
	}
	private updateParticipants = () => {
		this.participantsBase?.children?.forEach(c => c.destroy());
		if (this.participants.length) {
			for (let row = 0; row < this.participants.length; row++) {
				const participant = this.participants[row];
				const partLabel = this.createResultItem(participant, row);
				this.participantsGrid.addCell({
					...cardCellItemOptions,
					row,
					contents: partLabel
				})
			}
			this.participantsGrid.applyLayout();
		}
	}
	private attachBehaviors = () => {
		this.joinButton.setBehavior(MRE.ButtonBehavior)
			.onClick(user => {
				if (!this.ignoreClicks) {
					try {
						this.ignoreClicks = true;
						if (!this.participants.find(v => v.id === user.id)) {
							this.participants.push(user);
						}
						this.updateParticipants();
					} finally {
						this.ignoreClicks = false
					}
				}
			})

		this.removeMeButton.setBehavior(MRE.ButtonBehavior)
			.onClick(this.removeParticipant)
	}
	private removeParticipant = (user: MRE.User) => {
		if (!this.ignoreClicks) {
			try {
				this.ignoreClicks = true;
				const index = this.participants.findIndex(v => v.id === user.id);
				if (index > -1) {
					this.participants.splice(index, 1);
					this.updateParticipants();
				}
			} finally {
				this.ignoreClicks = false;
			}
		}

	}
	private keepShort = (val: string) => val.length > 23 ? val?.substring(0, 23) + '...' : val;
	protected createResultItem = (user: MRE.User, index = 0) => MRE.Actor.Create(this.context, {
		actor: {
			parentId: this.participantsBase.id,
			name: `participant-${user.id.toString()}`,
			appearance: {
				enabled: true
			},
			transform: {
				local: {
					position: { x: 0, y: 0, z: 0 }
				}
			},
			text: {
				pixelsPerLine: 1,
				contents: `${index + 1}. ${this.keepShort(user.name)} ${index === 0 ? ' << Get Ready!' : ""}`,
				height: 0.09,
				anchor: MRE.TextAnchorLocation.TopLeft,
				font: MRE.TextFontFamily.Cursive,
				justify: MRE.TextJustify.Left,
				color: index === 0 ? MRE.Color3.Yellow() : MRE.Color3.White()
			}
		}
	});
}

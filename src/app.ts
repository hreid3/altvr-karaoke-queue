/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from "@microsoft/mixed-reality-extension-sdk";
import { parseGuid } from "@microsoft/mixed-reality-extension-sdk";

/**
 * The main class of this Index. All the logic goes here.
 */
export default class App {
	private appRoot: MRE.Actor;
	private assetContainer: MRE.AssetContainer;
	private assets: MRE.Asset[] = []
	private soundAssets: Record<string, MRE.Sound>;
	private appStarted = false;

	constructor(private context: MRE.Context, private parameterSet: MRE.ParameterSet, private damBaseUri: string) {
		console.log("constructed", this.context.sessionId);
		this.context.onStarted(this.started);
		this.context.onStopped(this.stopped);
		this.context.onUserLeft(this.handleUserLeft);
		this.context.onUserJoined(this.handleUserJoined);
	}


	private handleUserJoined = async (user: MRE.User) => {
	};

	private handleUserLeft = (user: MRE.User) => {
	};

	private started = async () => {
		console.log("App Started");
	};

	private stopped = () => {
		console.log("App Stopped");
	};
}

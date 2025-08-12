import type { ScreenMPChat } from '/core/ui/mp-chat/screen-mp-chat.js';

interface ChatCommand {
	commandPrompts: string[];
	commandConfig: ChatCommandConfig;
}

interface ChatCommandConfig {
	description: string;
	commandArguments: string[];
	helpArguments: string[];
	commandHandler: (commandArguments: string[], messageContent: string, context: ScreenMPChat) => void;
}

export enum NotificationType {
	PLAYER = "Player",
	ERROR = "Error",
	HELP = "Help",
}

export enum NotificationClassNames {
	PLAYER = "player-message",
	ERROR = "error-message",
	HELP = "help-message",
}

export default class ChatCommandManager {
	private chatComponent: ScreenMPChat;
	private chatCommands: Map<string, ChatCommand> = new Map<string, ChatCommand>();
	private chatCommandConfigs: ChatCommand[] = [];

	constructor(component: ScreenMPChat) {
		this.chatComponent = component;
	}

	selectCommand(message: string) {
		const splitMessage: string[] = message.trim().split(" ");
		const firstWord: string = splitMessage[0];
		const isCommand: boolean = firstWord.startsWith("/");

		if (isCommand) {
			const commandPrompt: string = firstWord.slice(1);
			if (commandPrompt.length > 0) {
				const selectedCommand: ChatCommand | undefined = this.chatCommands.get(commandPrompt);

				if (selectedCommand == undefined) {
					this.chatComponent.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_UNKNOWN", commandPrompt));
					console.warn(`screen-mp-chat: Unknown command '/${commandPrompt}'`);
					return;
				}

				const selectedCommandConfig: ChatCommandConfig = selectedCommand.commandConfig;
				// command arguments are separate words	
				const argumentMessage: string[] = splitMessage.slice(1); // skip 'firstWord';
				const commandArguments: string[] = argumentMessage.slice(0, selectedCommandConfig.commandArguments.length);
				const messageContent: string = argumentMessage.splice(selectedCommandConfig.commandArguments.length).join(" ");

				selectedCommandConfig.commandHandler(commandArguments, messageContent, this.chatComponent);
			}
		}
	}

	// command definitions to register
	registerCommands() {
		const helpCommandConfig: ChatCommandConfig = {
			description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_HELP"),
			commandArguments: [],
			helpArguments: [],
			commandHandler: this.helpCommandHandler.bind(this),
		}

		const helpCommand: ChatCommand = {
			commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_HELP_SHORT"), Locale.compose("LOC_UI_CHAT_PROMPT_HELP_LONG")],
			commandConfig: helpCommandConfig
		}

		this.registerChatCommand(helpCommand);

		const privateMessageCommandConfig: ChatCommandConfig = {
			description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_PRIVATE", Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER")),
			commandArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER")],
			helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER"), Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
			commandHandler: this.privateMessageCommandHandler,
		}

		const privateMessageCommand: ChatCommand = {
			commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_PRIVATE_SHORT")],
			commandConfig: privateMessageCommandConfig
		}

		this.registerChatCommand(privateMessageCommand);

		const globalChatCommandConfig: ChatCommandConfig = {
			description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_GLOBAL"),
			commandArguments: [],
			helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
			commandHandler: this.globalChatCommandHandler,
		}

		const globalChatCommand: ChatCommand = {
			commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_GLOBAL_SHORT")],
			commandConfig: globalChatCommandConfig
		}

		this.registerChatCommand(globalChatCommand);

		const localTeamCommandConfig: ChatCommandConfig = {
			description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_TEAM"),
			commandArguments: [],
			helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
			commandHandler: this.localTeamCommandHandler,
		}

		const localTeamCommand: ChatCommand = {
			commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_TEAM_SHORT")],
			commandConfig: localTeamCommandConfig
		}

		this.registerChatCommand(localTeamCommand);

		const respondCommandConfig: ChatCommandConfig = {
			description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_RESPOND"),
			commandArguments: [],
			helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
			commandHandler: this.respondCommandHandler,
		}

		const respondCommand: ChatCommand = {
			commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_RESPOND_SHORT")],
			commandConfig: respondCommandConfig
		}

		this.registerChatCommand(respondCommand);
	}

	private helpCommandHandler(_commandArguments: string[], _messageContent: string, context: ScreenMPChat) {
		const commandList: string = this.stylizeHelpListContent(this.makeCommandList());
		const helpListContent: string = commandList;

		context.setMarkupMessage("");
		context.attachNodeToScrollable(context.createNotificationMessage(helpListContent, NotificationType.HELP));
	}

	private stylizeHelpListContent(commandList: string[]): string {
		const initialListToken: string = "[BLIST]";
		const finalListToken: string = "[/LIST]";
		const listToken: string = "[LI]";
		const newLineToken: string = "[N]";
		const introductionString: string = Locale.compose("LOC_UI_CHAT_COMMAND_LIST") + newLineToken;
		const listItems: string[] = commandList.map(commandLine => { return listToken + commandLine });
		const listItemString: string = listItems.join("");

		return Locale.stylize(introductionString + initialListToken + listItemString + finalListToken);
	}

	private makeCommandList(): string[] {
		return this.chatCommandConfigs.map(command => { return this.createCommandHelpLine(command) })
	}

	private createCommandHelpLine(command: ChatCommand): string {
		const { description, helpArguments }: ChatCommandConfig = command.commandConfig;
		const promptsHelp: string = this.joinPrompts(command.commandPrompts);
		const styleCommandPredicate: string = "[STYLE:screen-mp-chat__command-prompt]";
		const styleCommandDescription: string = "[STYLE:screen-mp-chat__command-description]";
		const predicate: string = styleCommandPredicate + `${promptsHelp} ${helpArguments.join(" ")}`;
		const commandHelpLine = `${predicate}: ${styleCommandDescription + description}`;
		return commandHelpLine;
	}

	private joinPrompts(prompts: string[]): string {
		let finalString = `/${prompts[0]}`;
		if (prompts.length == 1) {
			return finalString;
		} else {
			for (let prompt of prompts.slice(1).values()) {
				finalString = finalString + `, /${prompt}`;
			}
		}

		return finalString;
	}

	private privateMessageCommandHandler(commandArguments: string[], messageContent: string, context: ScreenMPChat) {
		let playersMatched: ChatTargetEntry[] = context.getCurrentPlayersByName(commandArguments.join(" "));
		const splitMessage: string[] = messageContent.split(" ");
		const totalArguments: string[] = [...commandArguments];
		let flag: number = 0;

		while (playersMatched.length > 1) {
			const nextArgument: string = splitMessage[flag];
			totalArguments.push(nextArgument);
			const argumentString: string = totalArguments.join(" ");
			playersMatched = context.getCurrentPlayersByName(argumentString);
			flag++;
		};

		// only one player should match
		if (playersMatched.length != 1) {
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_PLAYER", commandArguments[0]));
			console.warn(`screen-mp-chat: No single player found with name ${commandArguments[0]}. Player doesn't exist or there is more than one player with this name. Please write a precise name`);
			return;
		}

		// Update messageContent without the removed arguments from the player match
		messageContent = splitMessage.slice(flag).join(" ");

		if (!messageContent) {
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_BLANK"));
			console.warn("screen-mp-chat: Player attempted to send a blank message");
			return;
		}

		context.setMarkupMessage(messageContent);
		context.setCurrentTarget(playersMatched[0]);
	}

	private globalChatCommandHandler(_commandArguments: string[], messageContent: string, context: ScreenMPChat) {
		const globalTarget: ChatTargetEntry | undefined = context.getGlobalChatTarget();

		if (!globalTarget) {
			console.error("screen-mp-chat: There is not a global target to select");
			return;
		}

		if (!messageContent) {
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_BLANK"));
			console.warn("screen-mp-chat: Player attempted to send a blank message");
			return;
		}

		context.setMarkupMessage(messageContent);
		context.setCurrentTarget(globalTarget);
	};

	private localTeamCommandHandler(_commandArguments: string[], messageContent: string, context: ScreenMPChat) {
		const localTeamTarget: ChatTargetEntry | undefined = context.getLocalTeamChatTarget();

		if (!localTeamTarget) {
			console.error("screen-mp-chat: There is not local team target to select");
			return;
		}

		if (!messageContent) {
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_BLANK"));
			console.warn("screen-mp-chat: Player attempted to send a blank message");
			return;
		}

		context.setMarkupMessage(messageContent);
		context.setCurrentTarget(localTeamTarget);
	};

	private respondCommandHandler(_commandArguments: string[], messageContent: string, context: ScreenMPChat) {
		const lastPrivateToLocalTarget: ChatTargetEntry | undefined = context.lastPrivateToLocalTarget();

		if (!lastPrivateToLocalTarget) {
			console.error("screen-mp-chat: Nobody has sent a private message to the local player");
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_RESPOND"));
			return;
		}

		if (!messageContent) {
			context.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_BLANK"));
			console.warn("screen-mp-chat: Player attempted to send a blank message");
			return;
		}

		context.setMarkupMessage(messageContent);
		context.setCurrentTarget(lastPrivateToLocalTarget);
	}

	unregisterCommands() {
		this.chatCommands.clear();
	}

	private registerChatCommand(command: ChatCommand) {
		const commandPrompts: string[] = command.commandPrompts;
		for (let prompt of commandPrompts) {
			if (this.chatCommands.get(prompt)) {
				console.error("screen-mp-chat: Command prompt already registered, assign unique string values to prompts");
				return;
			}
			this.chatCommands.set(prompt, command);
		}

		// store the command objects for help lists
		this.chatCommandConfigs.push(command);
	}
}
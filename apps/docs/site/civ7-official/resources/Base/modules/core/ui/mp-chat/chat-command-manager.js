export var NotificationType;
(function (NotificationType) {
    NotificationType["PLAYER"] = "Player";
    NotificationType["ERROR"] = "Error";
    NotificationType["HELP"] = "Help";
})(NotificationType || (NotificationType = {}));
export var NotificationClassNames;
(function (NotificationClassNames) {
    NotificationClassNames["PLAYER"] = "player-message";
    NotificationClassNames["ERROR"] = "error-message";
    NotificationClassNames["HELP"] = "help-message";
})(NotificationClassNames || (NotificationClassNames = {}));
export default class ChatCommandManager {
    constructor(component) {
        this.chatCommands = new Map();
        this.chatCommandConfigs = [];
        this.chatComponent = component;
    }
    selectCommand(message) {
        const splitMessage = message.trim().split(" ");
        const firstWord = splitMessage[0];
        const isCommand = firstWord.startsWith("/");
        if (isCommand) {
            const commandPrompt = firstWord.slice(1);
            if (commandPrompt.length > 0) {
                const selectedCommand = this.chatCommands.get(commandPrompt);
                if (selectedCommand == undefined) {
                    this.chatComponent.setCommandError(Locale.compose("LOC_UI_CHAT_COMMAND_ERROR_UNKNOWN", commandPrompt));
                    console.warn(`screen-mp-chat: Unknown command '/${commandPrompt}'`);
                    return;
                }
                const selectedCommandConfig = selectedCommand.commandConfig;
                // command arguments are separate words	
                const argumentMessage = splitMessage.slice(1); // skip 'firstWord';
                const commandArguments = argumentMessage.slice(0, selectedCommandConfig.commandArguments.length);
                const messageContent = argumentMessage.splice(selectedCommandConfig.commandArguments.length).join(" ");
                selectedCommandConfig.commandHandler(commandArguments, messageContent, this.chatComponent);
            }
        }
    }
    // command definitions to register
    registerCommands() {
        const helpCommandConfig = {
            description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_HELP"),
            commandArguments: [],
            helpArguments: [],
            commandHandler: this.helpCommandHandler.bind(this),
        };
        const helpCommand = {
            commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_HELP_SHORT"), Locale.compose("LOC_UI_CHAT_PROMPT_HELP_LONG")],
            commandConfig: helpCommandConfig
        };
        this.registerChatCommand(helpCommand);
        const privateMessageCommandConfig = {
            description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_PRIVATE", Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER")),
            commandArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER")],
            helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_PLAYER"), Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
            commandHandler: this.privateMessageCommandHandler,
        };
        const privateMessageCommand = {
            commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_PRIVATE_SHORT")],
            commandConfig: privateMessageCommandConfig
        };
        this.registerChatCommand(privateMessageCommand);
        const globalChatCommandConfig = {
            description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_GLOBAL"),
            commandArguments: [],
            helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
            commandHandler: this.globalChatCommandHandler,
        };
        const globalChatCommand = {
            commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_GLOBAL_SHORT")],
            commandConfig: globalChatCommandConfig
        };
        this.registerChatCommand(globalChatCommand);
        const localTeamCommandConfig = {
            description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_TEAM"),
            commandArguments: [],
            helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
            commandHandler: this.localTeamCommandHandler,
        };
        const localTeamCommand = {
            commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_TEAM_SHORT")],
            commandConfig: localTeamCommandConfig
        };
        this.registerChatCommand(localTeamCommand);
        const respondCommandConfig = {
            description: Locale.compose("LOC_UI_CHAT_COMMAND_DESC_RESPOND"),
            commandArguments: [],
            helpArguments: [Locale.compose("LOC_UI_CHAT_COMMAND_ARG_MESSAGE")],
            commandHandler: this.respondCommandHandler,
        };
        const respondCommand = {
            commandPrompts: [Locale.compose("LOC_UI_CHAT_PROMPT_RESPOND_SHORT")],
            commandConfig: respondCommandConfig
        };
        this.registerChatCommand(respondCommand);
    }
    helpCommandHandler(_commandArguments, _messageContent, context) {
        const commandList = this.stylizeHelpListContent(this.makeCommandList());
        const helpListContent = commandList;
        context.setMarkupMessage("");
        context.attachNodeToScrollable(context.createNotificationMessage(helpListContent, NotificationType.HELP));
    }
    stylizeHelpListContent(commandList) {
        const initialListToken = "[BLIST]";
        const finalListToken = "[/LIST]";
        const listToken = "[LI]";
        const newLineToken = "[N]";
        const introductionString = Locale.compose("LOC_UI_CHAT_COMMAND_LIST") + newLineToken;
        const listItems = commandList.map(commandLine => { return listToken + commandLine; });
        const listItemString = listItems.join("");
        return Locale.stylize(introductionString + initialListToken + listItemString + finalListToken);
    }
    makeCommandList() {
        return this.chatCommandConfigs.map(command => { return this.createCommandHelpLine(command); });
    }
    createCommandHelpLine(command) {
        const { description, helpArguments } = command.commandConfig;
        const promptsHelp = this.joinPrompts(command.commandPrompts);
        const styleCommandPredicate = "[STYLE:screen-mp-chat__command-prompt]";
        const styleCommandDescription = "[STYLE:screen-mp-chat__command-description]";
        const predicate = styleCommandPredicate + `${promptsHelp} ${helpArguments.join(" ")}`;
        const commandHelpLine = `${predicate}: ${styleCommandDescription + description}`;
        return commandHelpLine;
    }
    joinPrompts(prompts) {
        let finalString = `/${prompts[0]}`;
        if (prompts.length == 1) {
            return finalString;
        }
        else {
            for (let prompt of prompts.slice(1).values()) {
                finalString = finalString + `, /${prompt}`;
            }
        }
        return finalString;
    }
    privateMessageCommandHandler(commandArguments, messageContent, context) {
        let playersMatched = context.getCurrentPlayersByName(commandArguments.join(" "));
        const splitMessage = messageContent.split(" ");
        const totalArguments = [...commandArguments];
        let flag = 0;
        while (playersMatched.length > 1) {
            const nextArgument = splitMessage[flag];
            totalArguments.push(nextArgument);
            const argumentString = totalArguments.join(" ");
            playersMatched = context.getCurrentPlayersByName(argumentString);
            flag++;
        }
        ;
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
    globalChatCommandHandler(_commandArguments, messageContent, context) {
        const globalTarget = context.getGlobalChatTarget();
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
    }
    ;
    localTeamCommandHandler(_commandArguments, messageContent, context) {
        const localTeamTarget = context.getLocalTeamChatTarget();
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
    }
    ;
    respondCommandHandler(_commandArguments, messageContent, context) {
        const lastPrivateToLocalTarget = context.lastPrivateToLocalTarget();
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
    registerChatCommand(command) {
        const commandPrompts = command.commandPrompts;
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

//# sourceMappingURL=file:///core/ui/mp-chat/chat-command-manager.js.map

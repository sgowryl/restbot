// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import restify from 'restify';
import MicrosoftAppCredentials from 'botframework-connector';
// Import required bot services.
// See https://.ms/bot-services to learn more about the different parts of a bot.
import {
   CloudAdapter,
   ConfigurationServiceClientCredentialFactory,
   InspectionMiddleware,
   InspectionState,
   MemoryStorage,
   ConversationState,
   UserState,
   ConfigurationBotFrameworkAuthentication,
   createBotFrameworkAuthenticationFromConfiguration
} from 'botbuilder';

import { RestBot } from './bots/restBot.js';


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
   console.log(`\n${server.name} listening to ${server.url}`);
   console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
   console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
   MicrosoftAppId: process.env.MicrosoftAppId,
   MicrosoftAppPassword: process.env.MicrosoftAppPassword,
   MicrosoftAppType: process.env.MicrosoftAppType,
   MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new CloudAdapter(botFrameworkAuthentication);


// Create the Storage provider and the various types of BotState.
const memoryStorage = new MemoryStorage();
const inspectionState = new InspectionState(memoryStorage);
const userState = new UserState(memoryStorage);
const conversationState = new ConversationState(memoryStorage);

// Create and add the InspectionMiddleware to the adapter.
//adapter.use(new InspectionMiddleware(inspectionState, userState, conversationState, new MicrosoftAppCredentials(process.env.MicrosoftAppId, process.env.MicrosoftAppPassword)));

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
   // This check writes out errors to console log .vs. app insights.
   // NOTE: In production environment, you should consider logging this to Azure
   //       application insights.
   console.error(`\n [onTurnError] unhandled error: ${error}`);

   // Send a trace activity, which will be displayed in Bot Framework Emulator
   await context.sendTraceActivity(
      'OnTurnError Trace',
      `${error}`,
      'https://www.botframework.com/schemas/error',
      'TurnError'
   );

   // Send a message to the user
   await context.sendActivity('The bot encountered an error or bug.');
   await context.sendActivity('To continue to run this bot, please fix the bot source code.');

   await conversationState.clear(context);
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
// const myBot = new EchoBot();
const myBot = new RestBot(conversationState, userState);

console.log('the selected bot is');
// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
   // Route received a request to adapter for processing
   await adapter.process(req, res, (context) => myBot.run(context));
});

// Listen for Upgrade requests for Streaming.
server.on('upgrade', async (req, socket, head) => {
   // Create an adapter scoped to this WebSocket connection to allow storing session data.
   const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

   // Set onTurnError for the CloudAdapter created for each connection.
   streamingAdapter.onTurnError = onTurnErrorHandler;

   await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});


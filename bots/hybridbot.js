
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import path from 'path';
import dotenv from 'dotenv';
import restify from 'restify';
import fetch from 'node-fetch';
// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
    ActivityHandler,
    MessageFactory,
   CloudAdapter,
   ConfigurationServiceClientCredentialFactory,
   createBotFrameworkAuthenticationFromConfiguration
} from 'botbuilder';

import { EchoBot } from './echobot.js';
import { RestBot } from './restBot.js';

import { fileURLToPath } from 'url';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

async function fetchData() {
    const data = await fetch("http://dummy.restapiexample.com/api/v1/employees")
    const json = await data.json()
    console.log('fetching is done');
    return json
}
//return the data with the employee_name same as the input 
function filterData(data, input) {
    console.log('input is', input);
    //reached here as rest
    return data.filter((employee) => employee.employee_name.toLowerCase().includes(input.toLowerCase()));
    
    /*  console.log('running');
    for(let i=0;i<data.length;i++){
        if(input === data[i].employee_name){
            console.log('data', data[i]);
            return data[i];
        }
    } */
}

class Bots extends ActivityHandler {
    constructor() {
        super();
        this.selectedBot = null; // Add a property to store the selected bot instance
        const echoBot = new EchoBot();
        const restBot = new RestBot();
        this.onMessage(async (context, next) => {
            console.log('on message is working');
            const message  = context.activity.text.toLowerCase(); // message=rest
            //console.log(this.selectedBot);
            if(message == 'echo'||message == 'rest'){
                this.selectedBot = message;
                console.log(this.selectedBot);
            }
            if(this.selectedBot == 'echo'){
                console.log('echo is working');
                
                const replyText = `Echo: ${ context.activity.text }`;
                await context.sendActivity(MessageFactory.text(replyText, replyText));
                // By calling next() you ensure that the next BotHandler is run.
                await next();
            }
             else{
                console.log('rest is working');
                const input = context.activity.text;        //input is rest first
                console.log('input in rest is', input);
                const employees = (await fetchData()).data;
                console.log('employees',employees);
                const filteredData = filterData(employees, input);
                console.log('filtered data is', filteredData);
                const suggestions = filteredData.map((employee, index) => `\n\n\nid: ${employee.id}\n\n\nname: ${employee.employee_name}\n\n\nsalary: ${employee.employee_salary}\n\n\nage: ${employee.employee_age}\n\n\nprofile image: ${employee.profile_image}`).join(", ")
                // filteredData.map((employee, index) => { input != data.find ? employee.employee_age : "" }
                const replyText = `Rest: welcome, enter your text ${suggestions}`;
                await context.sendActivity(MessageFactory.text(replyText, replyText));
                // By calling next() you ensure that the next BotHandler is run. 
                
                await next();
            } 
        });
 
        this.onMembersAdded(async (context, next) => {
            console.log('onmembers added is working');
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Enter "echo" for Echo Bot and "rest" for Rest Bot';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
    }
}

// Create an instance of the Bots class


server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
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

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;
// Listen for incoming requests.
const bots = new Bots();

/* let myBot;
console.log('the selected bot is', bots.selectedBot);
if(bots.selectedBot == 'echo'){
    myBot = new EchoBot(); 
    console.log('echo bot is calling');
}
else if(bots.selectedBot == 'rest'){
    myBot = new RestBot(); 
    console.log('rest bot is calling');
} */

server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => bots.run(context));
 });
// Listen for Upgrade requests for Streaming.
server.on('upgrade', async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
 
    // Set onTurnError for the CloudAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;
 
    await streamingAdapter.process(req, socket, head, (context) => bots.run(context));
 });


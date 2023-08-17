// Copyright (c) Microsoft Corporation. All rights reserved. 
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory, ConsoleTranscriptLogger } from 'botbuilder';
import fetch from 'node-fetch';


async function fetchData() {
    let json = { data: [] }
    try {
        const res = await fetch("http://dummy.restapiexample.com/api/v1/employees")
        try {
            json = await res.json()
        } catch (error) {
            console.log(res, res.headers)
            console.error("let's see ", res.status, res.statusText, error)
        }

    } catch (error) {
        console.error(error)
    }
    return json
}

function filterData(data, input) {
    return data.filter((employee) => employee.employee_name.toLowerCase().includes(input.toLowerCase())

        // todo check for age if input is number employee.employee_age : ""
    );
}

export class RestBot extends ActivityHandler {

    employees = null;

    constructor(conversationState, userState) {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.conversationStateAccessor = conversationState.createProperty('test-conversation-state');
        this.userStateAccessor = userState.createProperty('test-user-state');
        this.userState = userState;
        this.conversationState = conversationState;

        this.onMessage(async (context, next) => {
            //fetching the data
            const input = context.activity.text;

            const testConversationState = await this.conversationStateAccessor.get(context, { count: 0 });
            const testUserState = await this.userStateAccessor.get(context, { name: null });
            testConversationState.count++
            if (!this.employees) this.employees = (await fetchData()).data;
            console.log("onMessage", this.employees?.length, testUserState)

            let replyText = ''
            if (!testUserState.name) {
                testUserState.name = input;
                replyText = `Hello ${testUserState.name}, please enter the name of the employee to get the details.`;
            } else
                if (this.employees?.length == 0) {
                    replyText = `${testUserState.name}, something wrong with connection. Try again later`;
                } else {
                    const filteredData = filterData(this.employees, input);
                    if (filteredData.length == 0) {
                       replyText = `${testUserState.name}, there is no detail found for ${input} among ${this.employees.length} entries`;
                    }
                    else {
                        const suggestions = filteredData.map((employee, index) => `
                    
                    id: ${employee.id}
                    name: ${employee.employee_name}
                    salary: ${employee.employee_salary}
                    age: ${employee.employee_age}
                    profile image: ${employee.profile_image}
                    
                    
                    `).join("------------------------- ")
                        replyText = `${testUserState.name}, Found the user details: ${suggestions}`;
                    }
                }


            // print the current state to the reply to show we are incrementing it
            console.log(`You said '${context.activity.text}' conversation-state: ${testConversationState.count} user-state: ${testUserState.name}`);

            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run. 
            await next();
        });
        //fetching the data
        // const data = [];


        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            console.log("onMembersAdded ", context.activity)
            const welcomeText = 'Hello and welcome to RestBot. Please enter your name.';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}


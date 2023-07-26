// Copyright (c) Microsoft Corporation. All rights reserved. 
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory, ConsoleTranscriptLogger } from 'botbuilder';
import fetch from 'node-fetch';

async function fetchData() {

    const data = await fetch("http://dummy.restapiexample.com/api/v1/employees")
    const json = await data.json()
    return json
}

function filterData(data, input) {
    return data.filter((employee) => employee.employee_name.toLowerCase().includes(input.toLowerCase())
    );
}

export class RestBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            //fetching the data
            const input = context.activity.text;
            const employees = (await fetchData()).data;
            console.log(employees)
            const filteredData = filterData(employees, input);
            const suggestions = filteredData.map((employee, index) => `\n\n\nid: ${employee.id}\n\n\nname: ${employee.employee_name}\n\n\nsalary: ${employee.employee_salary}\n\n\nage: ${employee.employee_age}\n\n\nprofile image: ${employee.profile_image}`).join(", ")
            //  filteredData.map((employee, index) => { input != data.find ? employee.employee_age : "" })
            //.
            const replyText = `Echo: ${suggestions}`;
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run. 
            await next();
        });
        //fetching the data
        // const data = [];


        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

